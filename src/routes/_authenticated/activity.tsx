import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ComponentType, ReactNode } from "react";
import { Bookmark, CalendarCheck, MessageSquare, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { useSaved } from "@/hooks/use-saved";
import { markNotificationsRead, readNotifications } from "@/lib/notifications";

type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
type ListingParticipantRow = Database["public"]["Tables"]["listing_participants"]["Row"];

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "Activity — ShareCheya" },
      {
        name: "description",
        content: "Your joined shares, saved shares and latest conversations in one place.",
      },
      { property: "og:title", content: "Activity — ShareCheya" },
      {
        property: "og:description",
        content: "Your joined shares, saved shares and latest conversations.",
      },
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

      const participantRows = (parts ?? []) as ListingParticipantRow[];
      const ids = [
        ...new Set([...participantRows.map((p: ListingParticipantRow) => p.listing_id), ...saved]),
      ];
      const { data: listings } = ids.length
        ? await supabase.from("listings").select("id,title,starts_at,location").in("id", ids)
        : { data: [] as ListingRow[] };
      const byId = new Map<string, ListingRow>(
        (listings ?? []).map((listing: ListingRow) => [listing.id, listing]),
      );

      const joined = participantRows
        .map((p: ListingParticipantRow) => byId.get(p.listing_id))
        .filter((listing): listing is ListingRow => Boolean(listing));
      const savedListings = saved
        .map((id: string) => byId.get(id))
        .filter((listing): listing is ListingRow => Boolean(listing));
      const convosList = (convos ?? []).map(
        (c: { id: string; listing_id: string; last_message_at: string }) => ({
          ...c,
          listing: byId.get(c.listing_id),
        }),
      );

      return {
        joined,
        savedListings,
        convos: convosList,
      };
    },
  });

  const notifications = readNotifications();
  const handleMarkAllRead = () => markNotificationsRead();

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-lg">
        <h1 className="text-lg font-bold tracking-tight">Activity</h1>
      </header>

      <div className="mx-auto max-w-lg space-y-8 px-4 py-5">
        <section className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-semibold">
              <Bell className="h-4 w-4 text-primary" /> Notifications
            </div>
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              Mark all read
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {notifications.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border/60 bg-muted/40 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.title}</span>
                    {!item.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <p className="mt-1 text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <Section
          title="Shares you joined"
          icon={CalendarCheck}
          empty="Join a share and it shows up here."
        >
          {data?.joined.map((l: ListingRow) => (
            <Row
              key={l.id}
              id={l.id}
              title={l.title}
              subtitle={l.location ?? "Location flexible"}
            />
          ))}
        </Section>

        <Section title="Saved" icon={Bookmark} empty="Tap the bookmark on a share to save it.">
          {data?.savedListings.map((l: ListingRow) => (
            <Row
              key={l.id}
              id={l.id}
              title={l.title}
              subtitle={l.location ?? "Location flexible"}
            />
          ))}
        </Section>

        <Section title="Recent chats" icon={MessageSquare} empty="No conversations yet.">
          {data?.convos.map(
            (c: {
              id: string;
              listing: ListingRow | undefined;
              last_message_at: string | null;
            }) => (
              <Link
                key={c.id}
                to="/messages/$id"
                params={{ id: c.id }}
                className="block rounded-2xl border border-border/60 bg-card p-4 hover:border-primary"
              >
                <p className="truncate font-semibold">{c.listing?.title ?? "Share"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.last_message_at
                    ? new Date(c.last_message_at).toLocaleString()
                    : "No messages yet"}
                </p>
              </Link>
            ),
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  empty,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  empty: string;
  children: ReactNode;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const isEmpty = !items || (Array.isArray(items) && items.length === 0);
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
        <Icon className="h-4 w-4" /> {title}
      </h2>
      {isEmpty ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {empty}
        </p>
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
