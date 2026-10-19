import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Lock, ShieldAlert, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadShareResources, saveShareResources, type ShareResource } from "@/lib/innovation-layer";

export const Route = createFileRoute("/share-control")({
  component: ShareControlPage,
});

function ShareControlPage() {
  const [resources, setResources] = useState<ShareResource[]>([]);

  useEffect(() => {
    setResources(loadShareResources());
  }, []);

  const revoke = (id: string) => {
    const next = resources.map((resource) =>
      resource.id === id ? { ...resource, status: "Revoked" as const } : resource,
    );
    setResources(next);
    saveShareResources(next);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              ShareControl
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.06em]">Access management</h1>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/">Back home</Link>
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-[28px] border border-border bg-card p-5 shadow-[0_20px_40px_-26px_rgba(15,23,42,0.2)]">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldAlert className="h-4 w-4 text-primary" />
              Active shares
            </div>
            <div className="mt-3 text-3xl font-black">
              {resources.filter((item) => item.status === "Active").length}
            </div>
          </div>
          <div className="rounded-[28px] border border-border bg-card p-5 shadow-[0_20px_40px_-26px_rgba(15,23,42,0.2)]">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Lock className="h-4 w-4 text-primary" />
              Private links
            </div>
            <div className="mt-3 text-3xl font-black">
              {resources.filter((item) => item.audience === "Private").length}
            </div>
          </div>
          <div className="rounded-[28px] border border-border bg-card p-5 shadow-[0_20px_40px_-26px_rgba(15,23,42,0.2)]">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Activity className="h-4 w-4 text-primary" />
              Recent access
            </div>
            <div className="mt-3 text-3xl font-black">
              {resources.reduce((sum, item) => sum + item.downloads, 0)}
            </div>
          </div>
        </div>

        <section className="rounded-[28px] border border-border bg-card p-5 shadow-[0_20px_40px_-26px_rgba(15,23,42,0.2)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              Share dashboard
            </div>
            <Button asChild variant="secondary" className="rounded-full">
              <Link to="/new">Create new share</Link>
            </Button>
          </div>

          <div className="mt-5 space-y-4">
            {resources.map((resource) => (
              <div key={resource.id} className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-lg font-bold text-foreground">{resource.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {resource.type} • {resource.audience} • Expires {resource.expiry}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${resource.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                    >
                      {resource.status}
                    </span>
                    {resource.status === "Active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => revoke(resource.id)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Revoke
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <div>Downloads: {resource.downloads}</div>
                  <div>Can download: {resource.canDownload ? "Yes" : "No"}</div>
                  <div>Last access: {resource.lastAccessed}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
