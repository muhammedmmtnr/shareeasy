import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bookmark,
  Clock3,
  Compass,
  MapPin,
  Plus,
  Search,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
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
      {
        name: "description",
        content:
          "Scroll a live feed of nearby shares — rides, stays, food, trips and more. Join in one tap.",
      },
      { property: "og:title", content: "Discover shares — ShareCheya" },
      {
        property: "og:description",
        content: "A live feed of nearby shares you can join in one tap.",
      },
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
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
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
    <div className="min-h-screen bg-[#f4f7fb] pb-28">
      <div className="mx-auto max-w-[480px] bg-[#f4f7fb] pb-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f4f7fb]/90 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm">
              <Compass className="h-4 w-4" />
            </button>
            <div className="flex-1 text-center">
              <h1 className="text-[15px] font-black uppercase tracking-[0.18em] text-slate-500">
                Discover
              </h1>
            </div>
            <Button
              asChild
              size="sm"
              className="rounded-full bg-[image:var(--gradient-hero)] border-0 text-white shadow-sm"
            >
              <Link to="/new">
                <Plus className="mr-1 h-4 w-4" /> Create
              </Link>
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-4 py-3 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.25)]">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              aria-label="Search listings"
              placeholder="What do you want to do today?"
              className="w-full border-0 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
            <Sparkles className="h-4 w-4 text-violet-500" />
          </div>
        </header>

        <div className="px-4 pt-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Trending
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-900">
                Nearby moments
              </h2>
            </div>
            <button className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm">
              Filters
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Ride", accent: "bg-[#eaf7ff] text-sky-700", icon: "🚗" },
              { label: "Travel", accent: "bg-[#eefaf3] text-emerald-700", icon: "✈️" },
              { label: "Food", accent: "bg-[#fff4e9] text-orange-700", icon: "🍜" },
              { label: "Group", accent: "bg-[#f3ebff] text-violet-700", icon: "👥" },
            ].map((item) => (
              <button
                key={item.label}
                className={`flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm ${item.accent}`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pt-5">
          {isLoading && (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading feed…</p>
          )}

          {!isLoading && !data?.length && (
            <div className="rounded-2xl border border-dashed border-border bg-white p-12 text-center shadow-sm">
              <h2 className="font-semibold">Nothing here yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Post the first share and your community will see it here.
              </p>
              <Button asChild className="mt-5 rounded-full">
                <Link to="/new">Create a share</Link>
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {data?.map((l) => {
              const cat = CATEGORY_BY_SLUG[l.category];
              const spots = Math.max(0, l.capacity - l.joinedCount - 1);

              return (
                <article
                  key={l.id}
                  className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_30px_-24px_rgba(15,23,42,0.3)]"
                >
                  <Link to="/listings/$id" params={{ id: l.id }} className="block relative">
                    {l.image_url ? (
                      <img
                        src={l.image_url}
                        alt={l.title}
                        className="h-52 w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className={`h-52 w-full bg-gradient-to-br ${cat?.color ?? "from-primary to-accent"}`}
                      />
                    )}
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                      <span className="rounded-full border border-white/70 bg-white/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700 backdrop-blur-sm">
                        {cat?.label ?? l.category}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          toggle(l.id);
                        }}
                        className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/80 shadow-sm backdrop-blur-sm ${isSaved(l.id) ? "text-primary" : "text-slate-700"}`}
                        aria-label="Save listing"
                      >
                        <Bookmark className={`h-4 w-4 ${isSaved(l.id) ? "fill-current" : ""}`} />
                      </button>
                    </div>
                    <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1.5 text-[10px] font-semibold text-slate-700 backdrop-blur-sm">
                      <Clock3 className="h-3 w-3" /> {whenLabel(l.starts_at)}
                    </div>
                  </Link>

                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to="/listings/$id" params={{ id: l.id }} className="block">
                          <h2 className="text-xl font-black tracking-[-0.04em] text-slate-900 hover:text-primary">
                            {l.title}
                          </h2>
                        </Link>
                        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate">
                            {l.canSeeLocation
                              ? (l.location ?? "Location flexible")
                              : "Location locked until you're attending"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => share(l.id, l.title)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
                        aria-label="Share listing"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="line-clamp-2 text-sm leading-6 text-slate-600">{l.description}</p>

                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-primary" />
                        <span>{spots > 0 ? `${spots} spots left` : "Full"}</span>
                      </div>
                      <span className="font-semibold text-slate-900">
                        {l.capacity ? `${l.capacity} people` : "Open"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-left">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Match score
                        </div>
                        <div className="mt-1 text-lg font-black text-primary">92%</div>
                      </div>

                      <Button
                        asChild
                        className="rounded-full bg-[image:var(--gradient-hero)] border-0 text-white shadow-sm"
                      >
                        <Link to="/listings/$id" params={{ id: l.id }}>
                          I'm interested <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
