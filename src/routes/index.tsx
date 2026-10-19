import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Search,
  MapPin,
  Sparkles,
  Wallet,
  Shield,
  Users,
  Radio,
  MessageCircle,
  Network,
  Home as HomeIcon,
  Clock3,
  BadgeCheck,
  TrendingUp,
  Plus,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShareCheya — Ask. Match. Share. Save." },
      {
        name: "description",
        content:
          "Ask your community, discover the right people, share the resource, and save together on rides, stays, food, travel and more.",
      },
    ],
  }),
  component: Index,
});

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

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

  const liveAroundYou = [
    { icon: "🚗", label: "4 people need a ride" },
    { icon: "🛒", label: "8 people buying groceries" },
    { icon: "🛠", label: "2 cameras available" },
    { icon: "🍕", label: "6 people joining lunch" },
  ];

  const communityPills = ["Whitefield", "Friends", "Work", "Bangalore Students"];

  return (
    <div className="min-h-screen bg-background pb-28">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6">
        <section className="rounded-[30px] border border-border/60 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(59,130,246,0.08))] p-4 sm:p-6 lg:p-8">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Good evening 👋</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">
                What do you want to save on?
              </h1>
            </div>
            <div className="hidden rounded-full border border-border bg-white/80 px-3 py-2 text-sm font-medium text-foreground shadow-sm sm:flex sm:items-center sm:gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Whitefield
            </div>
          </div>

          <div className="rounded-[26px] border border-border/60 bg-card p-3 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.25)]">
            <label className="flex items-center gap-3 rounded-2xl bg-muted/70 px-4 py-4 text-sm text-muted-foreground ring-1 ring-transparent transition focus-within:ring-primary/40">
              <Search className="h-5 w-5 text-primary" />
              <input
                aria-label="Ask your community"
                placeholder="🔍 Ask your community..."
                className="w-full border-0 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                defaultValue="Need a ride to Whitefield tomorrow"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-[image:var(--gradient-hero)] text-white border-0 hover:opacity-95"
            >
              <Link to="/discover">
                Find a Share <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-border bg-white/70 hover:bg-white"
            >
              <Link to="/new">
                <Plus className="mr-2 h-4 w-4" /> Post a Share
              </Link>
            </Button>
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-border/60 bg-card p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.25)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Shareezy innovation layer
              </p>
              <h2 className="mt-1 text-2xl font-bold">Smart coordination for real life</h2>
            </div>
            <Button asChild size="sm" variant="secondary" className="rounded-full">
              <Link to="/pulse">Open Pulse</Link>
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Shareezy Pulse",
                description: "Intent-driven action launcher for group plans.",
                href: "/pulse",
              },
              {
                title: "Group Intelligence",
                description: "Build event drafts, task lists, and polls fast.",
                href: "/planner",
              },
              {
                title: "ShareControl",
                description: "Permission-aware links and access management.",
                href: "/share-control",
              },
              {
                title: "Commitment Clock",
                description: "Shared timers, reminders, and milestones.",
                href: "/commitment-clock",
              },
            ].map((item) => (
              <Link
                key={item.title}
                to={item.href}
                className="rounded-2xl border border-border/60 bg-muted/30 p-4 transition hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="text-base font-bold text-foreground">{item.title}</div>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-border/60 bg-card p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.25)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Live around you
                </p>
                <h2 className="mt-1 text-2xl font-bold">📍 Around You</h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Live
              </span>
            </div>
            <div className="space-y-3">
              {liveAroundYou.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/40 px-3 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium text-foreground">{item.label}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-border/60 bg-card p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.25)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Smart Match
                </p>
                <h2 className="mt-1 text-2xl font-bold">✨ Matched for you</h2>
              </div>
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                92% match
              </span>
            </div>
            <div className="space-y-4">
              {[
                {
                  from: "Bangalore",
                  to: "Mysore",
                  when: "Sunday · 7:30 AM",
                  people: "3 people",
                  price: "₹350/person",
                },
                {
                  from: "Whitefield",
                  to: "Airport",
                  when: "Tomorrow · 6:00 AM",
                  people: "2 seats",
                  price: "₹250/person",
                },
              ].map((match) => (
                <div
                  key={`${match.from}-${match.to}`}
                  className="rounded-2xl border border-border/60 bg-muted/30 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold">
                        {match.from} → {match.to}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{match.when}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-bold text-primary">{match.people}</div>
                      <div className="text-muted-foreground">{match.price}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button asChild variant="secondary" className="mt-4 w-full rounded-full">
              <Link to="/discover">View matches</Link>
            </Button>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-border/60 bg-card p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.25)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Your savings
                </p>
                <h2 className="mt-1 text-2xl font-bold">💰 Your savings</h2>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">This month</span>
            </div>
            <div className="flex items-center justify-center py-4">
              <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-[12px] border-emerald-100 bg-[conic-gradient(#34d399_0deg,#34d399_245deg,#e2e8f0_245deg_360deg)]">
                <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
                  <span className="text-xl font-black text-primary">₹4,820</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Saved
                  </span>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Your community has saved{" "}
              <span className="font-semibold text-foreground">₹18,42,500</span> this month.
            </p>
          </div>

          <div className="rounded-[28px] border border-border/60 bg-card p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.25)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Your communities
                </p>
                <h2 className="mt-1 text-2xl font-bold">👥 Your communities</h2>
              </div>
              <Button asChild size="sm" variant="ghost" className="rounded-full">
                <Link to="/communities">Join</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {communityPills.map((community) => (
                <span
                  key={community}
                  className="rounded-full border border-border bg-muted/60 px-3 py-2 text-sm font-medium text-foreground"
                >
                  {community}
                </span>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {[
                { name: "Ride sharing", value: "₹1,200" },
                { name: "Group buying", value: "₹1,400" },
                { name: "Borrowing", value: "₹900" },
                { name: "Food sharing", value: "₹620" },
              ].map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 px-3 py-2.5 text-sm"
                >
                  <span className="text-muted-foreground">{row.name}</span>
                  <span className="font-bold text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-border/60 bg-card p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.25)]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Group deals
              </p>
              <h2 className="mt-1 text-2xl font-bold">🔥 Group deals</h2>
            </div>
            <Button
              asChild
              size="sm"
              className="rounded-full bg-[image:var(--gradient-hero)] text-white border-0"
            >
              <Link to="/new">
                <Plus className="mr-2 h-4 w-4" /> Share
              </Link>
            </Button>
          </div>

          {featured && featured.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featured.slice(0, 3).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center text-sm text-muted-foreground">
              No shares nearby yet. Be the first to create one.
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "Ask the community",
              text: "Need a ride, a drill, a room or a bulk order? Describe it in plain English.",
            },
            {
              icon: Users,
              title: "Smart Match",
              text: "We connect compatible I HAVE and I NEED posts instantly.",
            },
            {
              icon: TrendingUp,
              title: "Save more",
              text: "Track the real savings from your community action every month.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-[24px] border border-border/60 bg-card p-5">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[image:var(--gradient-hero)] text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-[28px] border border-border/60 bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-600 p-6 text-white shadow-[0_18px_40px_-20px_rgba(13,148,136,0.9)] sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                Community first
              </p>
              <h2 className="mt-2 text-3xl font-black">Share more. Save more.</h2>
            </div>
            <Button
              asChild
              size="lg"
              className="rounded-full bg-white text-foreground hover:bg-white/95 border-0"
            >
              <Link to="/browse">Explore deals</Link>
            </Button>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-emerald-50/90">
            Find people who need the same things you do. Share the resource, split the bill, and
            save together.
          </p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Clock3, title: "Ask", text: "Describe the need in plain English" },
            { icon: BadgeCheck, title: "Match", text: "Find the nearest compatible share" },
            { icon: Wallet, title: "Save", text: "Track the savings from each join" },
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-[24px] border border-border/60 bg-card p-5 text-center"
            >
              <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-[28px] border border-border/60 bg-card p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.25)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Popular categories
              </p>
              <h2 className="mt-1 text-2xl font-bold">What people are sharing</h2>
            </div>
            <Link to="/browse" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <Link
                  key={category.slug}
                  to="/category/$slug"
                  params={{ slug: category.slug }}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/40 p-3 text-left transition-colors hover:bg-muted/70"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${category.color} text-white`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold">{category.label}</div>
                      <div className="text-xs text-muted-foreground">{category.tagline}</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </section>

        <footer className="mt-8 border-t border-border/60 pt-6 text-sm text-muted-foreground">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>ShareCheya — Share it. Split it. Save it.</span>
            </div>
            <div className="flex gap-4">
              <Link to="/discover" className="hover:text-foreground">
                Discover
              </Link>
              <Link to="/communities" className="hover:text-foreground">
                Communities
              </Link>
              <Link to="/how-it-works" className="hover:text-foreground">
                How it works
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
