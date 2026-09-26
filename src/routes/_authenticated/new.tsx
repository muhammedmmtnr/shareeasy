import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/new")({
  head: () => ({ meta: [{ title: "Post a share — ShareX" }] }),
  component: NewListing,
});

function NewListing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    category: "mobility",
    title: "",
    description: "",
    location: "",
    starts_at: "",
    total_cost: "",
    capacity: "4",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const total = form.total_cost ? Number(form.total_cost) : null;
    const cap = Number(form.capacity);
    const per = total != null ? Math.round((total / cap) * 100) / 100 : null;
    const { data, error } = await supabase.from("listings").insert({
      owner_id: user.id,
      category: form.category as never,
      title: form.title,
      description: form.description,
      location: form.location || null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      total_cost: total,
      cost_per_person: per,
      capacity: cap,
    }).select("id").single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Share posted!");
    navigate({ to: "/listings/$id", params: { id: data.id } });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Post a share</h1>
        <p className="mt-2 text-muted-foreground">Find people to split the cost with you.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-[var(--shadow-card)]">
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={form.title} onChange={e => set("title", e.target.value)}
              placeholder="e.g. Cab to Bengaluru Airport Saturday 6am" />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" required rows={4} value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Share details: route, timing, what's included, any rules…" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="loc">Location</Label>
              <Input id="loc" value={form.location} onChange={e => set("location", e.target.value)} placeholder="Kochi" />
            </div>
            <div>
              <Label htmlFor="when">When</Label>
              <Input id="when" type="datetime-local" value={form.starts_at} onChange={e => set("starts_at", e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cost">Total cost (₹)</Label>
              <Input id="cost" type="number" min="0" step="0.01" value={form.total_cost}
                onChange={e => set("total_cost", e.target.value)} placeholder="1200" />
            </div>
            <div>
              <Label htmlFor="cap">Capacity (incl. you)</Label>
              <Input id="cap" type="number" min="2" max="100" required value={form.capacity}
                onChange={e => set("capacity", e.target.value)} />
            </div>
          </div>
          <Button type="submit" disabled={busy} className="w-full rounded-full bg-[image:var(--gradient-hero)] text-white border-0 hover:opacity-95 h-11">
            {busy ? "Posting…" : "Post share"}
          </Button>
        </form>
      </div>
    </div>
  );
}
