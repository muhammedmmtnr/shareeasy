import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPulseResult, loadPulseResult, parsePulseIntent } from "@/lib/innovation-layer";

export const Route = createFileRoute("/pulse")({
  component: PulsePage,
});

const suggestionPrompts = [
  "Find a football group this evening.",
  "Plan a low-budget weekend trip.",
  "Find a study partner nearby.",
  "Organize a group dinner.",
  "Borrow a tool from my community.",
];

function PulsePage() {
  const [prompt, setPrompt] = useState("Find a football group this evening.");
  const [result, setResult] = useState(loadPulseResult());

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = loadPulseResult();
      if (stored) setResult(stored);
    }
  }, []);

  const parsed = useMemo(() => parsePulseIntent(prompt), [prompt]);

  const handleGenerate = () => {
    const next = createPulseResult(prompt);
    setResult(next);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Shareezy Pulse
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.06em]">Action launcher</h1>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/">Back home</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[28px] border border-border bg-card p-5 shadow-[0_20px_40px_-26px_rgba(15,23,42,0.2)]">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wand2 className="h-4 w-4 text-primary" />
              Intent capture
            </div>

            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              className="mt-4 w-full rounded-2xl border border-border bg-muted/40 p-4 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-primary"
              placeholder="Find a football group this evening..."
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {suggestionPrompts.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setPrompt(suggestion)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                onClick={handleGenerate}
                className="rounded-full bg-[image:var(--gradient-hero)] border-0 text-white"
              >
                Generate plan
              </Button>
              <Button asChild variant="secondary" className="rounded-full">
                <Link to="/planner">Open planner</Link>
              </Button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-muted/30 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Time
                </div>
                <div className="mt-2 text-base font-semibold">{parsed.time}</div>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Budget
                </div>
                <div className="mt-2 text-base font-semibold">{parsed.budget}</div>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Distance
                </div>
                <div className="mt-2 text-base font-semibold">{parsed.distance}</div>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Activity
                </div>
                <div className="mt-2 text-base font-semibold">{parsed.activity}</div>
              </div>
            </div>
          </section>

          <aside className="rounded-[28px] border border-border bg-card p-5 shadow-[0_20px_40px_-26px_rgba(15,23,42,0.2)]">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Suggested actions
            </div>

            {(result ?? parsed).actions.map((action) => (
              <div
                key={action.title}
                className="mt-4 rounded-2xl border border-border bg-muted/30 p-3"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <div className="font-semibold text-foreground">{action.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-5 rounded-2xl bg-[image:var(--gradient-hero)] p-4 text-white">
              <div className="text-xs uppercase tracking-[0.2em] text-white/80">
                Suggested match
              </div>
              <div className="mt-2 text-xl font-bold">Football group · Whitefield</div>
              <div className="mt-2 flex items-center justify-between text-sm text-white/90">
                <span>6 members online</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
