import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, LogOut, Plus, ShieldCheck, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/verified-badge";
import { RatingStars } from "@/components/rating-stars";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — ShareCheya" },
      { name: "description", content: "Your ShareCheya profile: rating, verification status and the shares you host." },
      { property: "og:title", content: "Your profile — ShareCheya" },
      { property: "og:description", content: "Your rating, verification status and hosted shares." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name,verified,rating_avg,rating_count")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const links = [
    { to: "/my", label: "My shares" },
    { to: "/messages", label: "Messages" },
    { to: "/communities", label: "Communities" },
    { to: "/browse", label: "Browse all shares" },
    { to: "/how-it-works", label: "How it works" },
  ] as const;

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-lg">
        <h1 className="text-lg font-bold tracking-tight">Profile</h1>
      </header>

      <div className="mx-auto max-w-lg space-y-6 px-4 py-5">
        <section className="rounded-3xl border border-border/60 bg-card p-5">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[image:var(--gradient-hero)] text-white">
              <UserIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-lg font-bold">{profile?.display_name ?? "ShareCheya user"}</p>
                {profile?.verified && <VerifiedBadge />}
              </div>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              <div className="mt-1">
                <RatingStars value={Number(profile?.rating_avg ?? 0)} count={profile?.rating_count ?? 0} />
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button asChild className="rounded-full bg-[image:var(--gradient-hero)] text-white border-0 hover:opacity-95">
              <Link to="/new"><Plus className="mr-1 h-4 w-4" /> Create</Link>
            </Button>
            {!profile?.verified && (
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/verify"><ShieldCheck className="mr-1 h-4 w-4" /> Get verified</Link>
              </Button>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-border/60 bg-card">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex items-center justify-between border-b border-border/60 px-5 py-4 text-sm font-medium last:border-0 hover:bg-muted/50"
            >
              {l.label} <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </section>

        <Button variant="ghost" onClick={signOut} className="w-full rounded-full text-destructive hover:text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}
