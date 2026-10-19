import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { parseAskIntent } from "@/lib/share-utils";

export const Route = createFileRoute("/_authenticated/new")({
  head: () => ({ meta: [{ title: "Post a share — ShareX" }] }),
  component: NewListing,
});

function NewListing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [form, setForm] = useState({
    category: "mobility",
    title: "",
    description: "",
    location: "",
    starts_at: "",
    total_cost: "",
    capacity: "4",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const parsedIntent = parseAskIntent(form.title || form.description || "");
  const previewPrice =
    Number(form.total_cost || 0) > 0 && Number(form.capacity || 1) > 0
      ? Number(form.total_cost) / Number(form.capacity)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Add a title and description before publishing.");
      return;
    }
    setBusy(true);
    const total = form.total_cost ? Number(form.total_cost) : null;
    const cap = Number(form.capacity);
    const per = total != null ? Math.round((total / cap) * 100) / 100 : null;
    const { data, error } = await supabase
      .from("listings")
      .insert({
        owner_id: user.id,
        category: form.category as never,
        title: form.title,
        description: form.description,
        location: form.location || null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        total_cost: total,
        cost_per_person: per,
        capacity: cap,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error(error.message || "Could not publish share.");
      return;
    }
    toast.success("Share published");
    navigate({ to: "/listings/$id", params: { id: data.id } });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Post a share</h1>
        <p className="mt-2 text-muted-foreground">Find people to split the cost with you.</p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5 rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]"
        >
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Cab to Bengaluru Airport Saturday 6am"
            />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              required
              rows={4}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Share details: route, timing, what's included, any rules…"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="loc">Location</Label>
              <Input
                id="loc"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Kochi"
              />
            </div>
            <div>
              <Label htmlFor="when">When</Label>
              <Input
                id="when"
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => set("starts_at", e.target.value)}
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cost">Total cost (₹)</Label>
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={form.total_cost}
                onChange={(e) => set("total_cost", e.target.value)}
                placeholder="1200"
              />
            </div>
            <div>
              <Label htmlFor="cap">Capacity (incl. you)</Label>
              <Input
                id="cap"
                type="number"
                min="2"
                max="100"
                required
                value={form.capacity}
                onChange={(e) => set("capacity", e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4">
            <div className="mb-2 flex items-center justify-between text-sm font-medium">
              <span>Preview</span>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="text-primary underline underline-offset-2"
              >
                {showPreview ? "Hide" : "Show"}
              </button>
            </div>
            {showPreview && (
              <div className="rounded-2xl border border-border/60 bg-card p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-primary">
                  {CATEGORIES.find((c) => c.slug === form.category)?.label ?? "Share"}
                </div>
                <h3 className="mt-2 text-xl font-bold">{form.title || "Untitled share"}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {form.description ||
                    "Add a detailed description to help the community understand what you need."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {form.location && <span>{form.location}</span>}
                  {form.starts_at && <span>{new Date(form.starts_at).toLocaleString()}</span>}
                </div>
                <div className="mt-4 text-lg font-bold text-primary">
                  {previewPrice > 0
                    ? `₹${previewPrice.toFixed(2)}/person`
                    : "Suggested contribution will appear here"}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Detected intent: {parsedIntent.category} · {parsedIntent.mode}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setShowPreview(true)}
            >
              Preview
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-full bg-[image:var(--gradient-hero)] text-white border-0 hover:opacity-95 h-11"
            >
              {busy ? "Publishing…" : "Publish share"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
