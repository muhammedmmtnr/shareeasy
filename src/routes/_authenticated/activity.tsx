import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, CalendarCheck, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSaved } from "@/hooks/use-saved";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "Activity — ShareCheya" },
      { name: "description", content: "Your joined shares, saved shares and latest conversations in one place." },
      { property: "og:title", content: "Activity — ShareCheya" },
      { property: "og:description", content: "Your joined shares, saved shares and latest conversations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const { user } = useAuth();
  const { saved } = useSaved();

  const { data } = useQuery({
    queryKey: ["activity", user?.id, saved.join(",")],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: parts }, { data: convos }] = await Promise.all([
        supabase.from("listing_participants").select("listing_id").eq("user_id", user!.id),
        supabase
          .from("conversations")
          .select("id,listing_id,last_message_at")
          .or(`owner_id.eq.${user!.id},joiner_id.eq.${user!.id}`)
          .order("last_message_at", { ascending: false })
          .limit(5),
      ]);

      const ids = [...new Set([...(parts ?? []).map((p) => p.listing_id), ...saved])];
      const { data: listings } = ids.length
        ? await supabase.from("listings").select("id,title,starts_at,location").in("id", ids)
        : { data: [] as { id: string; title: string; starts_at: string | null; location: string | null }[] };
      const byId = new Map((listings ?? []).map((l) => [l.id, l]));

      return {
        joined: (parts ?? []).map((p) => byId.get(p.listing_id)).filter(Boolean),
        savedListings: saved.map((id) => byId.get(id)).filter(Boolean),
        convos: (convos ?? []).map((c) => ({ ...c, listing: byId.get(c.listing_id) })),
      };
    },
  });

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-lg">
        <h1 className="text-lg font-bold tracking-tight">Activity</h1>
      </header>

      <div className="mx-auto max-w-lg space-y-8 px-4 py-5">
        <Section title="Shares you joined" icon={CalendarCheck} empty="Join a share and it shows up here.">
          {data?.joined.map((l) => (
            <Row key={l!.id} id={l!.id} title={l!.title} subtitle={l!.location ?? "Location flexible"} />
          ))}
        </Section>

        <Section title="Saved" icon={Bookmark} empty="Tap the bookmark on a share to save it.">
          {data?.savedListings.map((l) => (
            <Row key={l!.id} id={l!.id} title={l!.title} subtitle={l!.location ?? "Location flexible"} />
          ))}
        </Section>

        <Section title="Recent chats" icon={MessageSquare} empty="No conversations yet.">
          {data?.convos.map((c) => (
            <Link
              key={c.id}
              to="/messages/$id"
              params={{ id: c.id }}
              className="block rounded-2xl border border-border/60 bg-card p-4 hover:border-primary"
            >
              <p className="truncate font-semibold">{c.listing?.title ?? "Share"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {c.last_message_at ? new Date(c.last_message_at).toLocaleString() : "No messages yet"}
              </p>
            </Link>
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title, icon: Icon, empty, children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const isEmpty = !items || (Array.isArray(items) && items.length === 0);
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
        <Icon className="h-4 w-4" /> {title}
      </h2>
      {isEmpty ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-3">{items}</div>
      )}
    </section>
  );
}

function Row({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <Link
      to="/listings/$id"
      params={{ id }}
      className="block rounded-2xl border border-border/60 bg-card p-4 hover:border-primary"
    >
      <p className="truncate font-semibold">{title}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{subtitle}</p>
    </Link>
  );
}
