import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Search, Users, Wallet, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How ShareX works — Share Anything. Save Everything." },
      { name: "description", content: "Three simple steps to start saving money with your community on ShareX." },
    ],
  }),
  component: HowItWorks,
});

const STEPS = [
  { i: Search, t: "Find or post a share", d: "Browse live shares across 9 categories, or post your own — a taxi, a hotel, a Notion seat, a weekend trip." },
  { i: Users, t: "Match with people", d: "Join shares you like. Hosts review members. Verified profiles, ratings and trusted communities keep things safe." },
  { i: Wallet, t: "Split the cost", d: "Costs are split automatically. Pay your share via UPI or card. Escrow holds funds until the share is complete." },
];

function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[image:var(--gradient-hero)] opacity-95" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-4 py-1.5 text-sm text-white mb-6 border border-white/20">
            <Sparkles className="h-3.5 w-3.5" /> How it works
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white">From full price to fair share.</h1>
          <p className="mt-4 text-lg text-white/90">Three steps to start saving with your community.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
        <div className="space-y-6">
          {STEPS.map((s, i) => (
            <div key={s.t} className="flex items-start gap-6 rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[image:var(--gradient-warm)] text-white text-xl font-bold">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <s.i className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">{s.t}</h3>
                </div>
                <p className="mt-2 text-muted-foreground">{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Button asChild size="lg" className="rounded-full bg-[image:var(--gradient-hero)] text-white border-0 hover:opacity-95 h-12 px-8">
            <Link to="/browse">Start browsing</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
