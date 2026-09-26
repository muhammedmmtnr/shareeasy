import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Map of shares — ShareCheya" },
      { name: "description", content: "See shares near you on a map — rides, stays, group buys and trips around your city." },
      { property: "og:title", content: "Map of shares — ShareCheya" },
      { property: "og:description", content: "See shares near you on a map." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["map-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id,title,location,category")
        .not("location", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const selected = data?.find((l) => l.id === selectedId) ?? data?.[0];
  const mapUrl = selected?.location
    ? `https://www.google.com/maps?q=${encodeURIComponent(selected.location)}&output=embed`
    : null;

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-lg">
        <h1 className="text-lg font-bold tracking-tight">Map</h1>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-muted/30">
          {mapUrl && selected ? (
            <iframe
              key={selected.id}
              title={`Map showing ${selected.location}`}
              src={mapUrl}
              className="h-72 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="flex h-72 items-center justify-center px-6 text-center text-sm text-muted-foreground">
              {isLoading ? "Loading map…" : "No shares with a location yet."}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {data?.map((l) => {
            const active = selected?.id === l.id;
            return (
              <div
                key={l.id}
                className={`rounded-2xl border ${active ? "border-primary bg-primary/5" : "border-border/60 bg-card"}`}
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedId(l.id)}
                  className="h-auto w-full justify-start rounded-2xl p-4 text-left hover:bg-transparent"
                >
                  <span className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <span className="min-w-0">
                      <span className="block font-semibold line-clamp-2">{l.title}</span>
                      <span className="mt-1.5 flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> {l.location}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      {l.category}
                    </span>
                  </span>
                </Button>
                <Link
                  to="/listings/$id"
                  params={{ id: l.id }}
                  className="mb-4 ml-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Open share <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
