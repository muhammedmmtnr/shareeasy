import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Clock, MapPin, Plus, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CATEGORY_BY_SLUG } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSaved } from "@/hooks/use-saved";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover shares — ShareCheya" },
      { name: "description", content: "Scroll a live feed of nearby shares — rides, stays, food, trips and more. Join in one tap." },
      { property: "og:title", content: "Discover shares — ShareCheya" },
      { property: "og:description", content: "A live feed of nearby shares you can join in one tap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiscoverPage,
});

function whenLabel(iso: string | null) {
  if (!iso) return "Flexible";
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round((d.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return "Past";
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function DiscoverPage() {
  const { user } = useAuth();
  const { toggle, isSaved } = useSaved();

  const { data, isLoading } = useQuery({
    queryKey: ["discover-feed", user?.id],
    queryFn: async () => {
      const { data: listings, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const [{ data: parts }, { data: mine }] = await Promise.all([
        supabase.from("listing_participants").select("listing_id"),
        user
          ? supabase.from("listing_participants").select("listing_id").eq("user_id", user.id)
          : Promise.resolve({ data: [] as { listing_id: string }[] }),
      ]);

      const counts = new Map<string, number>();
      (parts ?? []).forEach((p) => counts.set(p.listing_id, (counts.get(p.listing_id) ?? 0) + 1));
      const joined = new Set((mine ?? []).map((p) => p.listing_id));

      return (listings ?? []).map((l) => ({
        ...l,
        joinedCount: counts.get(l.id) ?? 0,
        canSeeLocation: joined.has(l.id) || l.owner_id === user?.id,
      }));
    },
  });

  const share = async (id: string, title: string) => {
    const url = `${window.location.origin}/listings/${id}`;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* dismissed */
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-lg">
        <h1 className="truncate text-lg font-bold tracking-tight">Discover</h1>
        <Button asChild size="sm" className="rounded-full bg-[image:var(--gradient-hero)] text-white border-0 hover:opacity-95">
          <Link to="/new"><Plus className="mr-1 h-4 w-4" /> Create</Link>
        </Button>
      </header>

      <div className="mx-auto max-w-lg space-y-8 px-4 py-5">
        {isLoading && <p className="py-16 text-center text-sm text-muted-foreground">Loading feed…</p>}

        {!isLoading && !data?.length && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <h2 className="font-semibold">Nothing here yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Post the first share and your community will see it here.</p>
            <Button asChild className="mt-5 rounded-full"><Link to="/new">Create a share</Link></Button>
          </div>
        )}

        {data?.map((l) => {
          const cat = CATEGORY_BY_SLUG[l.category];
          const spots = Math.max(0, l.capacity - l.joinedCount - 1);
          return (
            <article key={l.id} className="space-y-3">
              <Link to="/listings/$id" params={{ id: l.id }} className="relative block overflow-hidden rounded-3xl">
                {l.image_url ? (
                  <img src={l.image_url} alt={l.title} className="h-56 w-full object-cover" loading="lazy" />
                ) : (
                  <div className={`h-56 w-full bg-gradient-to-br ${cat?.color ?? "from-primary to-accent"}`} />
                )}
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                  <Clock className="h-3.5 w-3.5" /> {whenLabel(l.starts_at)}
                </span>
              </Link>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <span className="truncate text-xs font-bold uppercase tracking-widest text-primary">
                  {cat?.label ?? l.category}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Button size="icon" variant="ghost" className="rounded-full" aria-label="Share" onClick={() => share(l.id, l.title)}>
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`rounded-full ${isSaved(l.id) ? "text-primary" : ""}`}
                    aria-label="Save"
                    aria-pressed={isSaved(l.id)}
                    onClick={() => toggle(l.id)}
                  >
                    <Bookmark className={`h-4 w-4 ${isSaved(l.id) ? "fill-current" : ""}`} />
                  </Button>
                </span>
              </div>

              <Link to="/listings/$id" params={{ id: l.id }} className="block">
                <h2 className="text-xl font-bold leading-snug hover:text-primary">{l.title}</h2>
              </Link>
              <p className="line-clamp-2 text-sm text-muted-foreground">{l.description}</p>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm text-muted-foreground">
                <span className="flex min-w-0 items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {l.canSeeLocation ? (l.location ?? "Location flexible") : "Location locked until you're attending"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <Users className="h-4 w-4" /> {spots > 0 ? `${spots} spots` : "Full"}
                </span>
              </div>

              <Button asChild className="w-full rounded-full bg-[image:var(--gradient-hero)] text-white border-0 hover:opacity-95">
                <Link to="/listings/$id" params={{ id: l.id }}>I'm interested</Link>
              </Button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
