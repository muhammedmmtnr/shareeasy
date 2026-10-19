import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarCheck2, CheckCircle2, Clock3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createGroupPlan, loadGroupPlan } from "@/lib/innovation-layer";

export const Route = createFileRoute("/planner")({
  component: PlannerPage,
});

function PlannerPage() {
  const [title, setTitle] = useState("Weekend brunch meetup");
  const [plan, setPlan] = useState(loadGroupPlan());

  useEffect(() => {
    const stored = loadGroupPlan();
    if (stored) setPlan(stored);
  }, []);

  const handleCreate = () => {
    const next = createGroupPlan(title);
    setPlan(next);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Group intelligence
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.06em]">One-tap plan</h1>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/">Back home</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[28px] border border-border bg-card p-5 shadow-[0_20px_40px_-26px_rgba(15,23,42,0.2)]">
            <label className="block text-sm font-medium text-foreground">Plan title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-border bg-muted/30 p-3 text-sm outline-none focus:border-primary"
            />

            <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CalendarCheck2 className="h-4 w-4 text-primary" />
                Event draft
              </div>
              <div className="mt-3 text-xl font-bold">{plan?.title ?? title}</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Confirm meetup point and time</li>
                <li>• Create an availability poll</li>
                <li>• Share a quick task list and reminders</li>
              </ul>
            </div>

            <div className="mt-5">
              <Button
                onClick={handleCreate}
                className="w-full rounded-full bg-[image:var(--gradient-hero)] border-0 text-white"
              >
                Generate group plan
              </Button>
            </div>
          </section>

          <section className="space-y-5 rounded-[28px] border border-border bg-card p-5 shadow-[0_20px_40px_-26px_rgba(15,23,42,0.2)]">
            {plan && (
              <>
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Participants
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
                        <Users className="h-4 w-4 text-primary" />
                        {plan.participants.join(" • ")}
                      </div>
                    </div>
                    <div className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      Ready to share
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Clock3 className="h-4 w-4 text-primary" />
                      Availability windows
                    </div>
                    <div className="mt-4 space-y-2">
                      {plan.availability.map((slot) => (
                        <div
                          key={slot.label}
                          className="flex items-center justify-between rounded-xl bg-background px-3 py-2 text-sm"
                        >
                          <span className="text-muted-foreground">{slot.label}</span>
                          <span className="font-semibold text-foreground">{slot.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Task list
                    </div>
                    <ul className="mt-4 space-y-2 text-sm text-foreground">
                      {plan.tasks.map((task) => (
                        <li key={task} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Packing checklist
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {plan.checklist.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
