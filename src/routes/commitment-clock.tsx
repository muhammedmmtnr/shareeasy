import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlarmClockCheck, PauseCircle, PlayCircle, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  loadCommitmentTimers,
  saveCommitmentTimers,
  type CommitmentTimer,
} from "@/lib/innovation-layer";

export const Route = createFileRoute("/commitment-clock")({
  component: CommitmentClockPage,
});

function formatTimeLeft(targetAt: string) {
  const remaining = new Date(targetAt).getTime() - Date.now();
  if (remaining <= 0) return "Completed";

  const totalMinutes = Math.max(1, Math.floor(remaining / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m left`;
}

function CommitmentClockPage() {
  const [timers, setTimers] = useState<CommitmentTimer[]>([]);

  useEffect(() => {
    setTimers(loadCommitmentTimers());
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimers((current) => current.map((timer) => ({ ...timer })));
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  const saveTimers = (next: CommitmentTimer[]) => {
    setTimers(next);
    saveCommitmentTimers(next);
  };

  const totalActive = useMemo(
    () => timers.filter((timer) => timer.status !== "done").length,
    [timers],
  );

  const toggleStatus = (id: string) => {
    const next = timers.map((timer) => {
      if (timer.id !== id) return timer;
      const nextStatus = timer.status === "running" ? "paused" : "running";
      return { ...timer, status: nextStatus };
    });
    saveTimers(next);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Commitment Clock
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.06em]">Shared timers</h1>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/">Back home</Link>
          </Button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-[28px] border border-border bg-card p-5 shadow-[0_20px_40px_-26px_rgba(15,23,42,0.2)]">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlarmClockCheck className="h-4 w-4 text-primary" />
              Active timers
            </div>
            <div className="mt-3 text-3xl font-black">{totalActive}</div>
          </div>
          <div className="rounded-[28px] border border-border bg-card p-5 shadow-[0_20px_40px_-26px_rgba(15,23,42,0.2)]">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TimerReset className="h-4 w-4 text-primary" />
              Reminders
            </div>
            <div className="mt-3 text-3xl font-black">{timers.length}</div>
          </div>
          <div className="rounded-[28px] border border-border bg-card p-5 shadow-[0_20px_40px_-26px_rgba(15,23,42,0.2)]">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PlayCircle className="h-4 w-4 text-primary" />
              Status
            </div>
            <div className="mt-3 text-lg font-black">
              {timers.some((timer) => timer.status === "running") ? "Live" : "Paused"}
            </div>
          </div>
        </div>

        <section className="space-y-4 rounded-[28px] border border-border bg-card p-5 shadow-[0_20px_40px_-26px_rgba(15,23,42,0.2)]">
          {timers.map((timer) => (
            <div key={timer.id} className="rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-lg font-bold text-foreground">{timer.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {timer.assignee} • {formatTimeLeft(timer.targetAt)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => toggleStatus(timer.id)}
                  >
                    {timer.status === "running" ? (
                      <PauseCircle className="mr-1 h-4 w-4" />
                    ) : (
                      <PlayCircle className="mr-1 h-4 w-4" />
                    )}
                    {timer.status === "running" ? "Pause" : "Resume"}
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {timer.milestones.map((milestone) => (
                  <span
                    key={milestone}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {milestone}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
