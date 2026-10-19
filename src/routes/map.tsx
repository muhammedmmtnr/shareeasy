import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import Map, { GeolocateControl, Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  AlertTriangle,
  ArrowUpRight,
  Compass,
  LocateFixed,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Map of shares — ShareCheya" },
      {
        name: "description",
        content:
          "See shares near you on a map — rides, stays, group buys and trips around your city.",
      },
      { property: "og:title", content: "Map of shares — ShareCheya" },
      { property: "og:description", content: "See shares near you on a map." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapPage,
});

type MapListing = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  category: string | null;
  status: string | null;
  starts_at: string | null;
  total_cost: number | null;
  cost_per_person: number | null;
  capacity: number | null;
  created_at: string | null;
  coords?: [number, number] | null;
};

type GeocodeResult = {
  label: string;
  lat: number;
  lon: number;
  type?: string;
  address?: string;
};

const DEFAULT_CENTER: [number, number] = [77.209, 28.6139];
const MAP_STYLE_URL = (import.meta.env.VITE_MAP_STYLE_URL ?? "").trim();
const GEOCODING_PROVIDER = (import.meta.env.VITE_GEOCODING_PROVIDER ?? "none").trim().toLowerCase();
const ROUTING_PROVIDER = (import.meta.env.VITE_ROUTING_PROVIDER ?? "none").trim().toLowerCase();
const SEARCH_CACHE = new Map<string, GeocodeResult[]>();
const CATEGORY_OPTIONS = [
  { slug: "all", label: "All Shares" },
  ...CATEGORIES.map((category) => ({ slug: category.slug, label: category.label })),
];

function formatMoney(value: number | null) {
  if (value == null || Number.isNaN(value)) return "Price on request";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getCategoryColor(category: string | null) {
  const palette: Record<string, string> = {
    mobility: "#f97316",
    accommodation: "#ec4899",
    food: "#f59e0b",
    shopping: "#10b981",
    travel: "#3b82f6",
    tickets: "#ef4444",
    software: "#8b5cf6",
    equipment: "#facc15",
    community: "#06b6d4",
  };
  return palette[category ?? "community"] ?? "#0f172a";
}

function getCategoryBadge(category: string | null) {
  const entry = CATEGORIES.find((item) => item.slug === category);
  return entry?.label ?? "Share";
}

function haversineKm(a: [number, number], b: [number, number]) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

async function geocodeAddress(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const cacheKey = normalized.toLowerCase();
  const cached = SEARCH_CACHE.get(cacheKey);
  if (cached) return cached;

  const response = await fetch(`/api/geocode?query=${encodeURIComponent(normalized)}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Search unavailable" }))) as {
      error?: string;
    };
    throw new Error(payload.error ?? "Place lookup failed.");
  }

  const payload = (await response.json()) as { results?: GeocodeResult[] };
  const results = payload.results ?? [];
  SEARCH_CACHE.set(cacheKey, results);
  return results;
}

async function reverseGeocode(lat: number, lon: number, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const response = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { results?: GeocodeResult[] };
  return payload.results?.[0] ?? null;
}

function MapPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRadius, setSelectedRadius] = useState(25);
  const [sortMode, setSortMode] = useState<"nearest" | "newest" | "price">("nearest");
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [manualLocation, setManualLocation] = useState<{ label: string; coords: [number, number] } | null>(null);
  const [viewState, setViewState] = useState({
    longitude: DEFAULT_CENTER[0],
    latitude: DEFAULT_CENTER[1],
    zoom: 4.5,
  });
  const activeSearchRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    activeSearchRef.current?.abort();
    activeSearchRef.current = controller;

    const timeoutId = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError(null);
        const results = await geocodeAddress(trimmed, controller.signal);
        if (!controller.signal.aborted) {
          setSearchResults(results.slice(0, 5));
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setSearchResults([]);
          setSearchError(
            error instanceof Error ? error.message : "Place lookup failed. Try a broader city name.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  const { data: listings = [], isLoading, error } = useQuery({
    queryKey: ["map-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id,title,description,location,category,status,starts_at,total_cost,cost_per_person,capacity,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const geocoded = await Promise.all(
        (data ?? []).map(async (listing: MapListing) => {
          const location = (listing.location ?? "").trim();
          if (!location) {
            return { ...listing, coords: null };
          }

          try {
            const matches = await geocodeAddress(location);
            const primary = matches[0];
            return {
              ...listing,
              coords: primary ? ([primary.lon, primary.lat] as [number, number]) : null,
            };
          } catch {
            return { ...listing, coords: null };
          }
        }),
      );

      return geocoded;
    },
    refetchInterval: 60000,
  });

  const filteredListings = useMemo(() => {
    const normalizedSearch = query.trim().toLowerCase();
    let next = listings.filter((listing) => {
      const matchesCategory =
        selectedCategory === "all" || (listing.category ?? "").toLowerCase() === selectedCategory;
      const haystack = `${listing.title} ${listing.location ?? ""} ${listing.description ?? ""}`.toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      const matchesRadius =
        !userCoords || !listing.coords || haversineKm(userCoords, listing.coords) <= selectedRadius;
      return matchesCategory && matchesSearch && matchesRadius;
    });

    if (sortMode === "nearest" && userCoords) {
      next = [...next].sort((a, b) => {
        const aDistance = a.coords ? haversineKm(userCoords, a.coords) : Number.POSITIVE_INFINITY;
        const bDistance = b.coords ? haversineKm(userCoords, b.coords) : Number.POSITIVE_INFINITY;
        return aDistance - bDistance;
      });
    }

    if (sortMode === "price") {
      next = [...next].sort((a, b) => {
        const aPrice = a.cost_per_person ?? a.total_cost ?? Number.POSITIVE_INFINITY;
        const bPrice = b.cost_per_person ?? b.total_cost ?? Number.POSITIVE_INFINITY;
        return aPrice - bPrice;
      });
    }

    if (sortMode === "newest") {
      next = [...next].sort((a, b) => {
        const aDate = new Date(a.created_at ?? 0).getTime();
        const bDate = new Date(b.created_at ?? 0).getTime();
        return bDate - aDate;
      });
    }

    return next.filter((listing) => listing.coords);
  }, [listings, query, selectedCategory, selectedRadius, sortMode, userCoords]);

  const selectedListing =
    filteredListings.find((listing) => listing.id === selectedId) ?? filteredListings[0] ?? null;

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setStatusMessage("Geolocation is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoords: [number, number] = [position.coords.longitude, position.coords.latitude];
        setUserCoords(nextCoords);
        setManualLocation(null);
        setStatusMessage("Showing shares around your current location.");
        setViewState({
          longitude: nextCoords[0],
          latitude: nextCoords[1],
          zoom: 10,
        });
      },
      () => {
        setStatusMessage("Location access was denied. You can still search by city or select a point on the map.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const handleLocationSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setStatusMessage("Type a city, neighborhood, or place name to look it up.");
      return;
    }

    try {
      const results = await geocodeAddress(trimmed);
      const primary = results[0];
      if (!primary) {
        setStatusMessage("No place matches that search yet. Try a broader neighborhood or city name.");
        return;
      }

      const coords: [number, number] = [primary.lon, primary.lat];
      setUserCoords(null);
      setManualLocation({ label: primary.label, coords });
      setStatusMessage(`Showing matches around ${primary.label}.`);
      setViewState({ longitude: coords[0], latitude: coords[1], zoom: 10 });
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "The search provider is unavailable right now.",
      );
    }
  };

  const handleMapPointSelect = async (longitude: number, latitude: number) => {
    const result = await reverseGeocode(latitude, longitude).catch(() => null);
    const label = result?.label ?? "Selected on map";
    setManualLocation({ label, coords: [longitude, latitude] });
    setUserCoords(null);
    setStatusMessage(`Selected a point near ${label}.`);
    setViewState({ longitude, latitude, zoom: 12 });
  };

  if (!MAP_STYLE_URL) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#edf5ff] px-4 py-10">
        <div className="max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
            <div className="text-sm font-semibold uppercase tracking-[0.18em]">Map configuration required</div>
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-[-0.06em] text-slate-900">
            Set the production map provider before launching the live map.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Add VITE_MAP_STYLE_URL, VITE_GEOCODING_PROVIDER, and VITE_ROUTING_PROVIDER to your environment to enable the real ShareCheya map.
          </p>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">Example</div>
            <div className="mt-2 font-mono text-xs">VITE_MAP_STYLE_URL=https://tiles.example.com/style.json</div>
            <div className="mt-1 font-mono text-xs">VITE_GEOCODING_PROVIDER=mapbox</div>
            <div className="mt-1 font-mono text-xs">VITE_ROUTING_PROVIDER=mapbox</div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="rounded-full bg-[image:var(--gradient-hero)] border-0 text-white">
              <Link to="/discover">Return to discover</Link>
            </Button>
            <Button type="button" variant="outline" className="rounded-full border-slate-200 bg-white" onClick={handleUseMyLocation}>
              Try location without map
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#edf5ff] text-slate-900">
      <div className="mx-auto max-w-[1700px] px-4 py-5 lg:px-6">
        <header className="rounded-[24px] border border-slate-200 bg-white/85 px-5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=160&q=80"
                  alt="ShareCheya"
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-sky-100"
                />
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    ShareCheya
                  </div>
                  <div className="text-xl font-black tracking-[-0.06em] text-slate-900">
                    Map of shares
                  </div>
                </div>
              </Link>
            </div>

            <div className="flex flex-1 flex-col gap-3 xl:max-w-[760px] xl:flex-row xl:items-center xl:justify-end">
              <div className="relative flex flex-1 items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 shadow-inner shadow-slate-100">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void handleLocationSearch();
                    }
                  }}
                  aria-label="Search shares"
                  placeholder="Search by city, place or listing title"
                  className="w-full border-0 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
                {searchLoading && (
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-sky-600">
                    Looking up…
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void handleLocationSearch()}
                  className="rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500"
                >
                  Search
                </button>

                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                    {searchResults.map((result) => (
                      <button
                        key={`${result.label}-${result.lon}-${result.lat}`}
                        type="button"
                        onClick={() => {
                          setQuery(result.label);
                          setSearchResults([]);
                          setManualLocation({ label: result.label, coords: [result.lon, result.lat] });
                          setUserCoords(null);
                          setStatusMessage(`Showing matches around ${result.label}.`);
                          setViewState({
                            longitude: result.lon,
                            latitude: result.lat,
                            zoom: 10,
                          });
                        }}
                        className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                      >
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">{result.label}</div>
                          <div className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                            {result.type ?? "Place"}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-slate-200 bg-white"
                  onClick={handleUseMyLocation}
                >
                  <Compass className="mr-2 h-4 w-4" />
                  Near me
                </Button>
                <Button asChild className="rounded-full bg-[image:var(--gradient-hero)] text-white border-0 hover:opacity-95">
                  <Link to="/new">
                    <Sparkles className="mr-2 h-4 w-4" /> Create share
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-5 grid gap-5 xl:grid-cols-[350px_minmax(0,1fr)_360px]">
          <aside className="rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Discovery</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.06em] text-slate-900">Find nearby</h2>
              </div>
              <div className="rounded-full bg-sky-50 p-2 text-sky-700">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((option) => (
                    <button
                      key={option.slug}
                      type="button"
                      onClick={() => setSelectedCategory(option.slug)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        selectedCategory === option.slug
                          ? "border-sky-600 bg-sky-600 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Radius
                  <select
                    value={selectedRadius}
                    onChange={(event) => setSelectedRadius(Number(event.target.value))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-400"
                  >
                    {[1, 5, 10, 25, 50, 100].map((radius) => (
                      <option key={radius} value={radius}>
                        Within {radius} km
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Sort by
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as "nearest" | "newest" | "price")}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-400"
                  >
                    <option value="nearest">Nearest</option>
                    <option value="newest">Newest</option>
                    <option value="price">Price</option>
                  </select>
                </label>
              </div>

              {(statusMessage || searchError) && (
                <div className="rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-700">
                  {searchError ?? statusMessage}
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
                <div className="font-semibold uppercase tracking-[0.15em] text-slate-500">Map provider</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>Style</span>
                  <span className="font-medium text-slate-900">{MAP_STYLE_URL ? "Configured" : "Missing"}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span>Geocoder</span>
                  <span className="font-medium text-slate-900">{GEOCODING_PROVIDER}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span>Routing</span>
                  <span className="font-medium text-slate-900">{ROUTING_PROVIDER}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {isLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  Loading listings…
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  We couldn’t load the map. Try refreshing the page.
                </div>
              ) : filteredListings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  No shares match your filters right now.
                </div>
              ) : (
                filteredListings.map((listing) => {
                  const active = selectedListing?.id === listing.id;
                  const distance =
                    userCoords && listing.coords ? `· ${haversineKm(userCoords, listing.coords).toFixed(1)} km away` : "";

                  return (
                    <button
                      key={listing.id}
                      type="button"
                      onClick={() => setSelectedId(listing.id)}
                      className={`w-full rounded-[24px] border p-4 text-left transition ${
                        active
                          ? "border-sky-200 bg-sky-50 shadow-[0_12px_25px_rgba(14,116,144,0.08)]"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white"
                              style={{ backgroundColor: getCategoryColor(listing.category) }}
                            >
                              {getCategoryBadge(listing.category).slice(0, 1).toUpperCase()}
                            </div>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                              {getCategoryBadge(listing.category)}
                            </span>
                          </div>

                          <h3 className="mt-3 text-base font-bold tracking-[-0.04em] text-slate-900">
                            {listing.title}
                          </h3>

                          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="line-clamp-1">{listing.location ?? "Flexible location"}</span>
                          </div>

                          <p className="mt-2 line-clamp-2 text-xs text-slate-600">
                            {listing.description ?? "Join this share and save together."}
                          </p>

                          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                            <span>
                              {listing.starts_at
                                ? new Date(listing.starts_at).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "Flexible timing"}
                            </span>
                            <span>{distance}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="text-right">
                            <div className="text-lg font-black tracking-tight text-sky-700">
                              {formatMoney(listing.cost_per_person ?? listing.total_cost)}
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                              {listing.capacity ? `${listing.capacity} slots` : "Open"}
                            </div>
                          </div>
                          <div className="flex items-center justify-center rounded-full bg-slate-100 p-2 text-slate-700">
                            <ArrowUpRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <main className="min-h-[760px] overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className="relative h-[760px] w-full">
              <Map
                mapLib={maplibregl}
                initialViewState={viewState}
                viewState={viewState}
                onMove={(event) => setViewState(event.viewState)}
                onClick={(event) => {
                  void handleMapPointSelect(event.lngLat.lng, event.lngLat.lat);
                }}
                mapStyle={MAP_STYLE_URL}
                style={{ width: "100%", height: "100%" }}
                attributionControl
              >
                <NavigationControl position="top-right" showCompass showZoom />
                <GeolocateControl position="top-right" />

                {userCoords && (
                  <Marker longitude={userCoords[0]} latitude={userCoords[1]} anchor="center">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-md">
                      <LocateFixed className="h-2.5 w-2.5 text-white" />
                    </div>
                  </Marker>
                )}

                {manualLocation && (
                  <Marker longitude={manualLocation.coords[0]} latitude={manualLocation.coords[1]} anchor="center">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-sky-600 shadow-md">
                      <MapPin className="h-2.5 w-2.5 text-white" />
                    </div>
                  </Marker>
                )}

                {filteredListings.map((listing) => {
                  if (!listing.coords) return null;
                  const selected = selectedListing?.id === listing.id;
                  const markerColor = getCategoryColor(listing.category);

                  return (
                    <Marker
                      key={listing.id}
                      longitude={listing.coords[0]}
                      latitude={listing.coords[1]}
                      anchor="bottom"
                      onClick={() => setSelectedId(listing.id)}
                    >
                      <button
                        type="button"
                        aria-label={listing.title}
                        className="flex items-center justify-center rounded-full border-2 border-white shadow-md transition-transform hover:scale-105"
                        style={{
                          width: selected ? 32 : 24,
                          height: selected ? 32 : 24,
                          backgroundColor: markerColor,
                          boxShadow: selected ? `0 0 0 8px ${markerColor}20` : undefined,
                        }}
                      >
                        <span className="text-[9px] font-bold text-white">
                          {getCategoryBadge(listing.category).slice(0, 1).toUpperCase()}
                        </span>
                      </button>
                    </Marker>
                  );
                })}

                {selectedListing && selectedListing.coords && (
                  <Popup
                    longitude={selectedListing.coords[0]}
                    latitude={selectedListing.coords[1]}
                    anchor="bottom"
                    closeButton={false}
                    closeOnClick={false}
                    offset={[0, -18]}
                  >
                    <div className="w-[260px] rounded-2xl p-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-bold text-slate-900">{selectedListing.title}</div>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                          {getCategoryBadge(selectedListing.category)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-600">{selectedListing.location ?? "Flexible pickup location"}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>{formatMoney(selectedListing.cost_per_person ?? selectedListing.total_cost)}</span>
                        <span>{selectedListing.capacity ? `${selectedListing.capacity} slots` : "Open"}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Link
                          to="/listings/$id"
                          params={{ id: selectedListing.id }}
                          className="inline-flex flex-1 items-center justify-center rounded-full bg-sky-600 px-3 py-2 text-xs font-semibold text-white"
                        >
                          View share
                        </Link>
                        <button
                          type="button"
                          onClick={() => setSelectedId(null)}
                          className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </Popup>
                )}
              </Map>
            </div>
          </main>

          <aside className="rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            {selectedListing ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Selected</p>
                    <h3 className="mt-1 text-2xl font-black tracking-[-0.06em] text-slate-900">
                      {selectedListing.title}
                    </h3>
                  </div>
                  <div className="rounded-full bg-sky-50 p-2 text-sky-700">
                    <Users className="h-4 w-4" />
                  </div>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                  <div
                    className="h-32 w-full bg-cover bg-center"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, rgba(14,116,144,0.2), rgba(125,211,252,0.08)), url(https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80)",
                    }}
                  />
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                      {getCategoryBadge(selectedListing.category)}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {selectedListing.status ?? "Open"}
                    </span>
                  </div>

                  <div className="mt-4 text-3xl font-black tracking-tight text-sky-700">
                    {formatMoney(selectedListing.cost_per_person ?? selectedListing.total_cost)}
                    <span className="ml-1 text-sm font-medium text-slate-500">/ person</span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{selectedListing.location ?? "Location flexible"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span>{selectedListing.capacity ? `${selectedListing.capacity} seats available` : "Open to community"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-slate-400" />
                      <span>
                        {selectedListing.starts_at
                          ? new Date(selectedListing.starts_at).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "Flexible times"}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm leading-6 text-slate-600">
                  {selectedListing.description ?? "A friendly community share opportunity for people looking to save together."}
                </p>

                <div className="flex flex-col gap-3">
                  <Button asChild className="rounded-full bg-[image:var(--gradient-hero)] text-white border-0 hover:opacity-95">
                    <Link to="/listings/$id" params={{ id: selectedListing.id }}>
                      View full details
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" className="rounded-full border-slate-200 bg-white">
                    Save listing
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[300px] items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                Select a listing to preview details.
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}
