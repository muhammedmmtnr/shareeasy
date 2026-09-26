import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — ShareX" }] }),
  component: MessagesLayout,
});

function MessagesLayout() {
  const { user } = useAuth();
  const loc = useLocation();
  const isThread = /\/messages\/[^/]+/.test(loc.pathname);

  const { data: convos } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: cs } = await supabase.from("conversations").select("*")
        .order("last_message_at", { ascending: false });
      if (!cs?.length) return [];
      const listingIds = [...new Set(cs.map(c => c.listing_id))];
      const otherIds = [...new Set(cs.map(c => c.joiner_id === user!.id ? c.owner_id : c.joiner_id))];
      const [{ data: ls }, { data: profs }] = await Promise.all([
        supabase.from("listings").select("id,title,category").in("id", listingIds),
        supabase.from("profiles").select("id,display_name,verified").in("id", otherIds),
      ]);
      return cs.map(c => ({
        ...c,
        listing: ls?.find(l => l.id === c.listing_id),
        other: profs?.find(p => p.id === (c.joiner_id === user!.id ? c.owner_id : c.joiner_id)),
      }));
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" /> Messages
        </h1>
        <div className="grid md:grid-cols-[320px_1fr] gap-6">
          <aside className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            {!convos?.length ? (
              <div className="p-6 text-sm text-muted-foreground text-center">
                No conversations yet. Start one from a listing.
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {convos.map(c => (
                  <li key={c.id}>
                    <Link
                      to="/messages/$id"
                      params={{ id: c.id }}
                      className="flex flex-col px-4 py-3 hover:bg-muted/50 transition"
                      activeProps={{ className: "bg-muted/70" }}
                    >
                      <span className="text-sm font-medium truncate">{c.listing?.title ?? "Listing"}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        with {c.other?.display_name ?? "user"}
                        {c.other?.verified && " ✓"}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(c.last_message_at).toLocaleString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </aside>
          <main>
            {isThread ? <Outlet /> : (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                Select a conversation to start chatting.
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
