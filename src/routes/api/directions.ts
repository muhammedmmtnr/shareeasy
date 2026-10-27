import { createFileRoute } from "@tanstack/react-router";

type OsrmResponse = {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: unknown };
  }>;
};

const PROVIDER = (process.env.VITE_ROUTING_PROVIDER ?? "osrm").trim().toLowerCase();
const OSRM_URL = (process.env.OSRM_API_URL ?? "https://router.project-osrm.org").replace(
  /\/+$/,
  "",
);

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function parseCoordinatePair(value: string | null): [number, number] | null {
  if (!value) return null;
  const parts = value.split(",");
  if (parts.length !== 2) return null;
  const lon = Number(parts[0]);
  const lat = Number(parts[1]);
  if (
    !Number.isFinite(lon) ||
    lon < -180 ||
    lon > 180 ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90
  ) {
    return null;
  }
  return [lon, lat];
}

export const Route = createFileRoute("/api/directions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = parseCoordinatePair(url.searchParams.get("origin"));
        const destination = parseCoordinatePair(url.searchParams.get("destination"));

        if (!origin || !destination) {
          return jsonError("Origin and destination must be valid lon,lat coordinates.", 400);
        }
        if (PROVIDER !== "osrm") {
          return jsonError("Road directions are unavailable. Set VITE_ROUTING_PROVIDER=osrm.", 503);
        }

        const coordinates = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
        const routeUrl = `${OSRM_URL}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;

        try {
          const response = await fetch(routeUrl, {
            headers: { Accept: "application/json" },
            signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
          });
          if (!response.ok) {
            console.error(`[route] OSRM request failed with status ${response.status}.`);
            return jsonError("Road directions are temporarily unavailable.", 503);
          }

          const payload = (await response.json()) as OsrmResponse;
          const route = payload.routes?.[0];
          const geometry = route?.geometry?.coordinates;
          if (
            payload.code !== "Ok" ||
            !route ||
            !Array.isArray(geometry) ||
            typeof route.distance !== "number" ||
            typeof route.duration !== "number"
          ) {
            return jsonError("No driving route was found between those locations.", 404);
          }
          const routeCoordinates = geometry.filter(
            (coordinate): coordinate is [number, number] =>
              Array.isArray(coordinate) &&
              coordinate.length >= 2 &&
              typeof coordinate[0] === "number" &&
              Number.isFinite(coordinate[0]) &&
              coordinate[0] >= -180 &&
              coordinate[0] <= 180 &&
              typeof coordinate[1] === "number" &&
              Number.isFinite(coordinate[1]) &&
              coordinate[1] >= -90 &&
              coordinate[1] <= 90,
          );
          if (routeCoordinates.length !== geometry.length || routeCoordinates.length < 2) {
            console.error("[route] OSRM returned invalid route geometry.");
            return jsonError("The routing provider returned an invalid route.", 502);
          }

          return Response.json({
            geometry: { type: "LineString", coordinates: routeCoordinates },
            distanceMeters: route.distance,
            durationSeconds: route.duration,
          });
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return jsonError("Directions request was cancelled.", 499);
          }
          if (error instanceof Error && error.name === "TimeoutError") {
            return jsonError("Directions timed out. Please try again.", 504);
          }
          console.error("[route] OSRM provider request failed:", error);
          return jsonError("Road directions are temporarily unavailable.", 503);
        }
      },
    },
  },
});
