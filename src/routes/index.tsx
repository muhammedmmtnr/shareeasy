import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles, Wallet, Shield, Users, Radio, MessageCircle, Network, Home as HomeIcon } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import logo3d from "@/assets/sharecheya-3d.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShareX — Share Anything. Save Everything." },
      { name: "description", content: "Find people to split rides, hotels, software, food, travel & more. Save money through community-powered cost sharing." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: featured } = useQuery({
    queryKey: ["featured-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[image:var(--gradient-hero)] opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white_0%,transparent_50%)] opacity-20" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-4 py-1.5 text-sm text-white/95 mb-6 border border-white/20">
              <Sparkles className="h-3.5 w-3.5" /> India's community-powered super app
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white leading-[1.05]">
              Share Anything.<br />
              <span className="bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">
                Save Everything.
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-white/90 max-w-2xl">
              Rides, hotels, software, group orders, trips, equipment — split the bill, share the resource, build the community.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full bg-white text-foreground hover:bg-white/95 h-12 px-7 text-base">
                <Link to="/browse">Browse shares <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-7 text-base bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white">
                <Link to="/new">Post a share</Link>
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {[
                { n: "9", l: "categories" },
                { n: "60%", l: "avg savings" },
                { n: "100%", l: "community" },
              ].map(s => (
                <div key={s.l}>
                  <div className="text-3xl font-bold text-white">{s.n}</div>
                  <div className="text-xs text-white/70 uppercase tracking-wider">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 3D LOGO */}
          <div className="relative flex justify-center lg:justify-end perspective-1200">
            <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_center,white_0%,transparent_60%)] opacity-25 blur-2xl" />
            <img
              src={logo3d.url}
              alt="ShareCheya"
              className="relative w-[280px] sm:w-[380px] lg:w-[460px] xl:w-[520px] h-auto animate-float-3d drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
              style={{ transform: "rotateY(-12deg) rotateX(8deg)" }}
            />
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">What do you want to share?</h2>
            <p className="mt-2 text-muted-foreground">Nine ways to save with your community.</p>
          </div>
          <Link to="/browse" className="hidden sm:inline-flex items-center text-sm font-medium text-primary hover:underline">
            View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.slug}
                to="/category/$slug"
                params={{ slug: cat.slug }}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-all hover:shadow-[var(--shadow-card)] hover:-translate-y-1"
              >
                <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${cat.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${cat.color} text-white mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg">{cat.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{cat.tagline}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* LIVE COMMUNITY PLATFORM */}
      <section className="relative overflow-hidden border-y border-border/60 bg-gradient-to-br from-emerald-50 via-teal-50 to-indigo-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-indigo-950/30">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-white/10 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-primary mb-5 border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              LAUNCHING SOON · 🇮🇳 INDIA'S FIRST
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
              India's First <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">Live Community Platform</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              The future of communities is about to change. A new way to discover people, share ideas, and build communities — all in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { i: Radio, t: "Real-time Conversations", d: "Live, in-the-moment discussions with your tribe.", c: "from-rose-500 to-pink-500", e: "✨" },
              { i: MessageCircle, t: "Live Chat", d: "Instant messaging across every community room.", c: "from-emerald-500 to-teal-500", e: "💬" },
              { i: Network, t: "Network & Connect", d: "Find people who share your goals and interests.", c: "from-sky-500 to-indigo-500", e: "🌐" },
              { i: HomeIcon, t: "Community Hubs", d: "Apartments, campuses, offices — one place for all.", c: "from-amber-500 to-orange-500", e: "🏠" },
            ].map(f => (
              <div key={f.t} className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 hover:-translate-y-1 hover:shadow-[var(--shadow-card)] transition-all">
                <div className={`absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br ${f.c} opacity-10 group-hover:opacity-20 transition`} />
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.c} text-white mb-4`}>
                  <f.i className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-base flex items-center gap-1.5">{f.t} <span>{f.e}</span></h3>
                <p className="text-sm text-muted-foreground mt-1">{f.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full bg-[image:var(--gradient-hero)] text-white border-0 h-12 px-7">
              <Link to="/communities">Explore Community Hubs <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <p className="text-xs text-muted-foreground">Stay tuned for the official launch.</p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {["#India", "#Community", "#LiveChat", "#Networking", "#Innovation", "#StartupLaunch"].map(t => (
              <span key={t} className="rounded-full bg-white/70 dark:bg-white/10 border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>


      {/* FEATURED */}
      {featured && featured.length > 0 && (
        <section className="bg-muted/40 border-y border-border/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Live shares</h2>
                <p className="mt-2 text-muted-foreground">Active opportunities to save right now.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          </div>
        </section>
      )}

      {/* WHY */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Why ShareX</h2>
          <p className="mt-3 text-muted-foreground">A new economy built on sharing, not spending.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { i: Wallet, t: "Save up to 80%", d: "Split fixed costs across multiple people and unlock bulk pricing." },
            { i: Users, t: "Real communities", d: "Apartments, colleges, offices, startups — verified, trusted groups." },
            { i: Shield, t: "Safe by design", d: "ID verification, ratings, escrow payments and dispute resolution." },
          ].map(f => (
            <div key={f.t} className="rounded-2xl border border-border/60 bg-card p-6">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[image:var(--gradient-warm)] text-white mb-4">
                <f.i className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg">{f.t}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-[image:var(--gradient-hero)] p-10 sm:p-16 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,white_0%,transparent_60%)] opacity-15" />
          <div className="relative">
            <h2 className="text-3xl sm:text-5xl font-bold text-white">Stop paying full price.</h2>
            <p className="mt-4 text-lg text-white/90 max-w-xl mx-auto">Join ShareX and start saving with your community today.</p>
            <Button asChild size="lg" className="mt-8 rounded-full bg-white text-foreground hover:bg-white/95 h-12 px-8">
              <Link to="/auth">Get started — it's free</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>ShareX — Share Anything. Save Everything.</span>
          </div>
          <div className="flex gap-4">
            <Link to="/browse" className="hover:text-foreground">Browse</Link>
            <Link to="/how-it-works" className="hover:text-foreground">How it works</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
