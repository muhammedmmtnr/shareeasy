import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { ListingCard } from "@/components/listing-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/my")({
  head: () => ({ meta: [{ title: "My shares — ShareX" }] }),
  component: MyShares,
});

function MyShares() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["my-shares", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [owned, joined] = await Promise.all([
        supabase.from("listings").select("*").eq("owner_id", user!.id).order("created_at", { ascending: false }),
        supabase.from("listing_participants").select("listing_id").eq("user_id", user!.id),
      ]);
      const joinedIds = (joined.data ?? []).map(p => p.listing_id);
      let joinedListings: typeof owned.data = [];
      if (joinedIds.length) {
        const { data: lst } = await supabase.from("listings").select("*").in("id", joinedIds);
        joinedListings = lst ?? [];
      }
      return { owned: owned.data ?? [], joined: joinedListings ?? [] };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">My shares</h1>

        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Shares I'm hosting</h2>
            <Link to="/new" className="text-sm text-primary hover:underline">+ New share</Link>
          </div>
          {!data?.owned.length ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              You haven't posted any shares yet.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.owned.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Shares I've joined</h2>
          {!data?.joined.length ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              Browse and join a share to see it here.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.joined.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
