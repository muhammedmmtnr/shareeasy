import { createFileRoute } from "@tanstack/react-router";

type GeocodeSuggestion = {
  label: string;
  lat: number;
  lon: number;
  type?: string;
  address?: string;
};

type PhotonFeature = {
  geometry?: { coordinates?: unknown };
  properties?: Record<string, unknown>;
};

const PROVIDER = (process.env.VITE_GEOCODING_PROVIDER ?? "photon").trim().toLowerCase();
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_LIMIT = 500;
const REQUEST_TIMEOUT_MS = 7_000;
const cache = new Map<string, { expiresAt: number; result: GeocodeSuggestion[] }>();
const pending = new Map<string, Promise<GeocodeSuggestion[]>>();

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function validCoordinates(lat: number, lon: number) {
  return (
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    Number.isFinite(lon) &&
    lon >= -180 &&
    lon <= 180
  );
}

function photonFeatureToSuggestion(feature: PhotonFeature): GeocodeSuggestion | null {
  const coordinates = feature.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const [lon, lat] = coordinates.map(Number);
  if (!validCoordinates(lat, lon)) return null;

  const properties = feature.properties ?? {};
  const addressParts = [
    properties.name,
    properties.street,
    properties.city,
    properties.state,
    properties.country,
  ]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .filter((part, index, all) => all.indexOf(part) === index);
  const label = addressParts.join(", ") || "Selected location";

  return {
    label,
    lat,
    lon,
    type: typeof properties.type === "string" ? properties.type : undefined,
    address: label,
  };
}

async function fetchJson(url: string, requestSignal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.any([requestSignal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
  });
  if (!response.ok) {
    throw new Error(`Geocoding provider returned ${response.status}.`);
  }
  return response.json() as Promise<unknown>;
}

async function queryPhoton(query: string, signal: AbortSignal): Promise<GeocodeSuggestion[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;
  const payload = (await fetchJson(url, signal)) as { features?: PhotonFeature[] };
  return (payload.features ?? [])
    .map(photonFeatureToSuggestion)
    .filter((item): item is GeocodeSuggestion => item !== null);
}

async function reversePhoton(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<GeocodeSuggestion[]> {
  const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`;
  const payload = (await fetchJson(url, signal)) as { features?: PhotonFeature[] };
  return (payload.features ?? [])
    .slice(0, 1)
    .map(photonFeatureToSuggestion)
    .filter((item): item is GeocodeSuggestion => item !== null);
}

function readCached(key: string) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.result;
}

async function cachedLookup(key: string, lookup: () => Promise<GeocodeSuggestion[]>) {
  const cached = readCached(key);
  if (cached) return cached;

  const existing = pending.get(key);
  if (existing) return existing;

  const request = lookup()
    .then((result) => {
      if (cache.size >= CACHE_LIMIT) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) cache.delete(oldestKey);
      }
      cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
      return result;
    })
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

async function geocode(query: string, lat: number | null, lon: number | null, signal: AbortSignal) {
  if (PROVIDER !== "photon") {
    throw new Error(
      `Unsupported geocoding provider "${PROVIDER}". Set VITE_GEOCODING_PROVIDER=photon.`,
    );
  }

  const key = query
    ? `search:${query.toLowerCase()}`
    : `reverse:${lat?.toFixed(5)},${lon?.toFixed(5)}`;
  return cachedLookup(key, () => {
    if (query) return queryPhoton(query, signal);
    if (lat !== null && lon !== null) return reversePhoton(lat, lon, signal);
    return Promise.resolve([]);
  });
}

export const Route = createFileRoute("/api/geocode")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get("query")?.trim() ?? "";
        const latValue = url.searchParams.get("lat");
        const lonValue = url.searchParams.get("lon");

        if (query && (latValue !== null || lonValue !== null)) {
          return jsonError("Provide a place query or coordinates, not both.", 400);
        }
        if (query.length > 120) {
          return jsonError("Search text must be 120 characters or fewer.", 400);
        }
        if (!query && (latValue === null || lonValue === null)) {
          return jsonError("Provide a place query or both lat and lon coordinates.", 400);
        }
        if ((latValue !== null && !latValue.trim()) || (lonValue !== null && !lonValue.trim())) {
          return jsonError("Latitude and longitude must be valid numbers.", 400);
        }

        const lat = latValue === null ? null : Number(latValue);
        const lon = lonValue === null ? null : Number(lonValue);
        if (lat !== null && lon !== null && !validCoordinates(lat, lon)) {
          return jsonError("Coordinates are outside the valid latitude or longitude range.", 400);
        }

        try {
          const results = await geocode(query, lat, lon, request.signal);
          return Response.json({ results });
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return jsonError("Place search was cancelled.", 499);
          }
          if (error instanceof Error && error.name === "TimeoutError") {
            return jsonError("The place search timed out. Please try again.", 504);
          }
          console.error("[geocode] Provider request failed:", error);
          return jsonError("Place search is temporarily unavailable. Please try again.", 503);
        }
      },
    },
  },
});
