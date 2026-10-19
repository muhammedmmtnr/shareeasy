import { createFileRoute } from "@tanstack/react-router";

type GeocodeSuggestion = {
  label: string;
  lat: number;
  lon: number;
  type?: string;
  address?: string;
};

const PROVIDER = (process.env.VITE_GEOCODING_PROVIDER ?? "none").trim().toLowerCase();

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as unknown;
}

function toSuggestion(item: Record<string, unknown>): GeocodeSuggestion | null {
  const lat = Number(item.lat ?? item.latitude);
  const lon = Number(item.lon ?? item.longitude ?? item.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const label = String(
    item.display_name ?? item.name ?? item.place_name ?? item.formatted ?? "Selected location",
  );

  return {
    label,
    lat,
    lon,
    type: typeof item.type === "string" ? item.type : undefined,
    address: typeof item.address === "string" ? item.address : undefined,
  };
}

async function searchWithNominatim(query: string): Promise<GeocodeSuggestion[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`;
  const payload = (await fetchJson(url, {
    headers: {
      "User-Agent": "ShareCheya/1.0 (support@sharecheya.com)",
      Referer: "https://sharecheya.app",
    },
  })) as Array<Record<string, unknown>>;

  return payload.map((item) => toSuggestion(item)).filter(Boolean) as GeocodeSuggestion[];
}

async function searchWithMapbox(query: string): Promise<GeocodeSuggestion[]> {
  const token = process.env.MAPBOX_API_KEY;
  if (!token) {
    throw new Error("MAPBOX_API_KEY is not configured on the server.");
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=5&access_token=${encodeURIComponent(token)}`;
  const payload = (await fetchJson(url)) as { features?: Array<Record<string, unknown>> };

  return (payload.features ?? [])
    .map((feature) => {
      const [lon, lat] = Array.isArray(feature.center) ? feature.center : [undefined, undefined];
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return {
        label: String(feature.place_name ?? feature.text ?? "Selected location"),
        lat,
        lon,
        type: typeof feature.place_type === "string" ? feature.place_type : undefined,
      };
    })
    .filter(Boolean) as GeocodeSuggestion[];
}

async function searchWithOpenCage(query: string): Promise<GeocodeSuggestion[]> {
  const token = process.env.OPENCAGE_API_KEY;
  if (!token) {
    throw new Error("OPENCAGE_API_KEY is not configured on the server.");
  }

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&limit=5&key=${encodeURIComponent(token)}`;
  const payload = (await fetchJson(url)) as { results?: Array<Record<string, unknown>> };

  return (payload.results ?? [])
    .map((result) => {
      const geometry = result.geometry as Record<string, unknown> | undefined;
      const lat = Number(geometry?.lat ?? result.lat);
      const lon = Number(geometry?.lng ?? result.lng ?? result.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

      return {
        label: String(result.formatted ?? result.components?.city ?? "Selected location"),
        lat,
        lon,
        type: typeof result.components?._type === "string" ? result.components?._type : undefined,
      };
    })
    .filter(Boolean) as GeocodeSuggestion[];
}

async function reverseWithNominatim(lat: number, lon: number): Promise<GeocodeSuggestion | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  const payload = (await fetchJson(url, {
    headers: {
      "User-Agent": "ShareCheya/1.0 (support@sharecheya.com)",
      Referer: "https://sharecheya.app",
    },
  })) as Record<string, unknown>;

  return toSuggestion(payload);
}

async function reverseWithMapbox(lat: number, lon: number): Promise<GeocodeSuggestion | null> {
  const token = process.env.MAPBOX_API_KEY;
  if (!token) {
    throw new Error("MAPBOX_API_KEY is not configured on the server.");
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?limit=1&access_token=${encodeURIComponent(token)}`;
  const payload = (await fetchJson(url)) as { features?: Array<Record<string, unknown>> };
  const feature = payload.features?.[0];
  if (!feature) return null;

  const [lng, latitude] = Array.isArray(feature.center) ? feature.center : [undefined, undefined];
  if (!Number.isFinite(latitude) || !Number.isFinite(lng)) return null;

  return {
    label: String(feature.place_name ?? "Selected location"),
    lat: latitude,
    lon: lng,
    type: typeof feature.place_type === "string" ? feature.place_type : undefined,
  };
}

async function reverseWithOpenCage(lat: number, lon: number): Promise<GeocodeSuggestion | null> {
  const token = process.env.OPENCAGE_API_KEY;
  if (!token) {
    throw new Error("OPENCAGE_API_KEY is not configured on the server.");
  }

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&limit=1&key=${encodeURIComponent(token)}`;
  const payload = (await fetchJson(url)) as { results?: Array<Record<string, unknown>> };
  const result = payload.results?.[0];
  if (!result) return null;

  const geometry = result.geometry as Record<string, unknown> | undefined;
  const latitude = Number(geometry?.lat ?? result.lat ?? lat);
  const longitude = Number(geometry?.lng ?? result.lng ?? result.lon ?? lon);

  return {
    label: String(result.formatted ?? "Selected location"),
    lat: latitude,
    lon: longitude,
    type: typeof result.components?._type === "string" ? result.components?._type : undefined,
  };
}

async function geocodeSearch(query: string): Promise<GeocodeSuggestion[]> {
  switch (PROVIDER) {
    case "mapbox":
      return searchWithMapbox(query);
    case "opencage":
      return searchWithOpenCage(query);
    case "nominatim":
      return searchWithNominatim(query);
    default:
      throw new Error(
        "Map geocoding is not configured. Set VITE_GEOCODING_PROVIDER and the matching server secret in your environment.",
      );
  }
}

async function reverseGeocode(lat: number, lon: number): Promise<GeocodeSuggestion | null> {
  switch (PROVIDER) {
    case "mapbox":
      return reverseWithMapbox(lat, lon);
    case "opencage":
      return reverseWithOpenCage(lat, lon);
    case "nominatim":
      return reverseWithNominatim(lat, lon);
    default:
      throw new Error(
        "Map geocoding is not configured. Set VITE_GEOCODING_PROVIDER and the matching server secret in your environment.",
      );
  }
}

export const Route = createFileRoute("/api/geocode")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get("query")?.trim();
        const latValue = url.searchParams.get("lat");
        const lonValue = url.searchParams.get("lon");

        if (!query && !(latValue && lonValue)) {
          return jsonError("Missing query or lat/lon coordinates.", 400);
        }

        try {
          if (latValue && lonValue) {
            const lat = Number(latValue);
            const lon = Number(lonValue);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
              return jsonError("Invalid coordinates provided.", 400);
            }

            const suggestion = await reverseGeocode(lat, lon);
            return Response.json({ results: suggestion ? [suggestion] : [] });
          }

          const results = await geocodeSearch(query ?? "");
          return Response.json({ results });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Geocoding lookup failed.";
          return jsonError(message, 503);
        }
      },
    },
  },
});
