import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, List, Map, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse shares — ShareX" },
      { name: "description", content: "Browse all active cost-sharing opportunities across mobility, stays, food, software, travel and more." },
    ],
  }),
  component: BrowsePage,
});

function BrowsePage() {
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: listings, isLoading } = useQuery({
    queryKey: ["all-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const listingsWithLocations = listings?.filter((listing) => listing.location) ?? [];
  const selectedListing = listingsWithLocations.find((listing) => listing.id === selectedId) ?? listingsWithLocations[0];
  const mapUrl = selectedListing?.location
    ? `https://www.google.com/maps?q=${encodeURIComponent(selectedListing.location)}&output=embed`
    : null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <header className="mb-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Browse all shares</h1>
              <p className="mt-2 text-muted-foreground">Discover ways to save across every category.</p>
            </div>
            <div className="inline-flex w-fit items-center rounded-xl border border-border bg-card p-1" aria-label="Browse view">
              <Button
                type="button"
                variant={view === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
              >
                <List className="h-4 w-4" /> List
              </Button>
              <Button
                type="button"
                variant={view === "map" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("map")}
                aria-pressed={view === "map"}
              >
                <Map className="h-4 w-4" /> Map
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(c => (
            <Link
              key={c.slug}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium hover:border-primary hover:text-primary transition-colors"
            >
              <c.icon className="h-3.5 w-3.5" /> {c.label}
            </Link>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Loading shares…</div>
        ) : !listings || listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <h3 className="text-lg font-semibold">No shares yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Be the first to post one and start saving.</p>
            <Link to="/new" className="inline-flex mt-6 items-center justify-center rounded-full bg-[image:var(--gradient-hero)] text-white px-5 py-2 text-sm font-medium">
              Post a share
            </Link>
          </div>
        ) : view === "list" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        ) : listingsWithLocations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No mapped shares yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Shares with a location will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
            <div className="space-y-3 lg:max-h-[620px] lg:overflow-y-auto lg:pr-2">
              {listingsWithLocations.map((listing) => {
                const isSelected = selectedListing?.id === listing.id;
                return (
                  <div
                    key={listing.id}
                    className={`rounded-2xl border transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-border/60 bg-card"}`}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setSelectedId(listing.id)}
                      className="h-auto w-full justify-start rounded-2xl p-4 text-left hover:bg-transparent"
                    >
                      <span className="flex min-w-0 flex-1 items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block font-semibold line-clamp-2">{listing.title}</span>
                          <span className="mt-2 flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" /> {listing.location}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          {listing.category}
                        </span>
                      </span>
                    </Button>
                    <Link
                      to="/listings/$id"
                      params={{ id: listing.id }}
                      className="mb-4 ml-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Open share <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
            <div className="min-h-[420px] overflow-hidden rounded-2xl border border-border/60 bg-muted/30">
              {mapUrl && selectedListing ? (
                <iframe
                  key={selectedListing.id}
                  title={`Map showing ${selectedListing.location}`}
                  src={mapUrl}
                  className="h-full min-h-[420px] w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-muted-foreground">Select a share to view its map.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
