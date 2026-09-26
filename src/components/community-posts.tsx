import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, ShoppingBag, Car, BarChart3, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

const KIND_META = {
  discussion: { label: "Discussion", icon: MessageSquare, color: "text-sky-500", bg: "bg-sky-500/10" },
  bulk_buy:   { label: "Bulk-buy", icon: ShoppingBag, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ride:       { label: "Ride request", icon: Car, color: "text-orange-500", bg: "bg-orange-500/10" },
  poll:       { label: "Poll", icon: BarChart3, color: "text-violet-500", bg: "bg-violet-500/10" },
} as const;

type Kind = keyof typeof KIND_META;

export function CommunityPosts({
  communityId, meId, members,
}: {
  communityId: string;
  meId: string;
  members: Record<string, { display_name: string | null }>;
}) {
  const qc = useQueryClient();

  const { data: posts } = useQuery({
    queryKey: ["community-posts", communityId],
    queryFn: async () => {
      const { data } = await supabase.from("community_posts").select("*")
        .eq("community_id", communityId).order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const { data: votes } = useQuery({
    queryKey: ["community-poll-votes", communityId],
    queryFn: async () => {
      const postIds = (posts ?? []).filter(p => p.kind === "poll").map(p => p.id);
      if (!postIds.length) return [];
      const { data } = await supabase.from("poll_votes").select("*").in("post_id", postIds);
      return data ?? [];
    },
    enabled: !!posts,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["community-posts", communityId] });
    qc.invalidateQueries({ queryKey: ["community-poll-votes", communityId] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NewPostDialog communityId={communityId} meId={meId} onCreated={refresh} />
      </div>

      {!posts?.length ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No posts yet. Start a discussion, announce a bulk-buy, request a ride, or run a poll.
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map(p => {
            const meta = KIND_META[p.kind as Kind] ?? KIND_META.discussion;
            const Icon = meta.icon;
            const author = members[p.author_id]?.display_name ?? "Member";
            return (
              <li key={p.id} className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${meta.bg} ${meta.color}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                      <h4 className="font-semibold leading-tight">{p.title}</h4>
                    </div>
                  </div>
                  {p.author_id === meId && (
                    <button onClick={async () => {
                      if (!confirm("Delete this post?")) return;
                      await supabase.from("community_posts").delete().eq("id", p.id);
                      refresh();
                    }} className="text-muted-foreground hover:text-destructive" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {p.body && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{p.body}</p>}
                <PostDetails post={p} votes={(votes ?? []).filter(v => v.post_id === p.id)} meId={meId} onChange={refresh} />
                <div className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/60">
                  by {author} · {new Date(p.created_at).toLocaleString()}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PostDetails({ post, votes, meId, onChange }: { post: any; votes: any[]; meId: string; onChange: () => void }) {
  if (post.kind === "bulk_buy") {
    const m = post.meta ?? {};
    return (
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        {m.item && <Stat label="Item" value={m.item} />}
        {m.target_qty && <Stat label="Target qty" value={String(m.target_qty)} />}
        {m.price_per_unit && <Stat label="Price / unit" value={`₹${m.price_per_unit}`} />}
        {m.deadline && <Stat label="Deadline" value={new Date(m.deadline).toLocaleDateString()} />}
      </div>
    );
  }
  if (post.kind === "ride") {
    const m = post.meta ?? {};
    return (
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        {m.from && <Stat label="From" value={m.from} />}
        {m.to && <Stat label="To" value={m.to} />}
        {m.when && <Stat label="When" value={new Date(m.when).toLocaleString()} />}
        {m.seats && <Stat label="Seats" value={String(m.seats)} />}
      </div>
    );
  }
  if (post.kind === "poll") {
    const options: string[] = post.meta?.options ?? [];
    const myVote = votes.find(v => v.user_id === meId);
    const totals = options.map((_, i) => votes.filter(v => v.option_index === i).length);
    const total = totals.reduce((a, b) => a + b, 0) || 1;
    const vote = async (idx: number) => {
      if (myVote) {
        await supabase.from("poll_votes").update({ option_index: idx }).eq("id", myVote.id);
      } else {
        const { error } = await supabase.from("poll_votes").insert({ post_id: post.id, user_id: meId, option_index: idx });
        if (error) return toast.error(error.message);
      }
      onChange();
    };
    return (
      <div className="mt-3 space-y-2">
        {options.map((opt, i) => {
          const pct = Math.round((totals[i] / total) * 100);
          const mine = myVote?.option_index === i;
          return (
            <button key={i} onClick={() => vote(i)}
              className={`relative w-full text-left rounded-xl border ${mine ? "border-primary" : "border-border"} bg-muted/30 px-3 py-2 overflow-hidden hover:bg-muted transition`}>
              <div className="absolute inset-y-0 left-0 bg-primary/15" style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {mine && <Check className="h-3.5 w-3.5 text-primary" />} {opt}
                </span>
                <span className="text-xs text-muted-foreground">{totals[i]} · {pct}%</span>
              </div>
            </button>
          );
        })}
        <p className="text-[10px] text-muted-foreground">{votes.length} vote{votes.length === 1 ? "" : "s"}</p>
      </div>
    );
  }
  return null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function NewPostDialog({ communityId, meId, onCreated }: { communityId: string; meId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [meta, setMeta] = useState<any>({});
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);

  const reset = () => { setTitle(""); setBody(""); setMeta({}); setPollOptions(["", ""]); setKind("discussion"); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Add a title");
    let finalMeta: any = meta;
    if (kind === "poll") {
      const opts = pollOptions.map(o => o.trim()).filter(Boolean);
      if (opts.length < 2) return toast.error("Add at least 2 options");
      finalMeta = { options: opts };
    }
    setBusy(true);
    const { error } = await supabase.from("community_posts").insert({
      community_id: communityId, author_id: meId, kind, title: title.trim(),
      body: body.trim() || null, meta: finalMeta,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Posted");
    setOpen(false); reset(); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button className="rounded-full bg-[image:var(--gradient-hero)] text-white border-0">
          <Plus className="h-4 w-4 mr-1.5" /> New post
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a post</DialogTitle>
          <DialogDescription>Share with everyone in this community.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="discussion"><MessageSquare className="h-3.5 w-3.5 mr-1" />Talk</TabsTrigger>
              <TabsTrigger value="bulk_buy"><ShoppingBag className="h-3.5 w-3.5 mr-1" />Bulk</TabsTrigger>
              <TabsTrigger value="ride"><Car className="h-3.5 w-3.5 mr-1" />Ride</TabsTrigger>
              <TabsTrigger value="poll"><BarChart3 className="h-3.5 w-3.5 mr-1" />Poll</TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="title" className="mb-1.5 block">Title</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
                  placeholder={
                    kind === "ride" ? "Need a ride to airport tomorrow 6am"
                    : kind === "bulk_buy" ? "Bulk Amul milk order"
                    : kind === "poll" ? "What time should we host the diwali party?"
                    : "What's on your mind?"
                  } />
              </div>
              {kind !== "poll" && (
                <div>
                  <Label htmlFor="body" className="mb-1.5 block">Details {kind === "discussion" && "(optional)"}</Label>
                  <Textarea id="body" value={body} onChange={e => setBody(e.target.value)} rows={3} maxLength={1000} />
                </div>
              )}

              <TabsContent value="bulk_buy" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Item" value={meta.item ?? ""} onChange={v => setMeta((m: any) => ({ ...m, item: v }))} />
                  <Field label="Target qty" value={meta.target_qty ?? ""} type="number" onChange={v => setMeta((m: any) => ({ ...m, target_qty: v }))} />
                  <Field label="Price / unit (₹)" value={meta.price_per_unit ?? ""} type="number" onChange={v => setMeta((m: any) => ({ ...m, price_per_unit: v }))} />
                  <Field label="Deadline" value={meta.deadline ?? ""} type="date" onChange={v => setMeta((m: any) => ({ ...m, deadline: v }))} />
                </div>
              </TabsContent>

              <TabsContent value="ride" className="space-y-3 mt-0">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="From" value={meta.from ?? ""} onChange={v => setMeta((m: any) => ({ ...m, from: v }))} />
                  <Field label="To" value={meta.to ?? ""} onChange={v => setMeta((m: any) => ({ ...m, to: v }))} />
                  <Field label="When" value={meta.when ?? ""} type="datetime-local" onChange={v => setMeta((m: any) => ({ ...m, when: v }))} />
                  <Field label="Seats needed" value={meta.seats ?? ""} type="number" onChange={v => setMeta((m: any) => ({ ...m, seats: v }))} />
                </div>
              </TabsContent>

              <TabsContent value="poll" className="space-y-2 mt-0">
                <Label className="block">Options</Label>
                {pollOptions.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={o} onChange={e => setPollOptions(opts => opts.map((x, j) => j === i ? e.target.value : x))}
                      placeholder={`Option ${i + 1}`} maxLength={80} />
                    {pollOptions.length > 2 && (
                      <Button type="button" variant="outline" size="icon" onClick={() => setPollOptions(opts => opts.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 6 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setPollOptions(opts => [...opts, ""])}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add option
                  </Button>
                )}
              </TabsContent>
            </div>
          </Tabs>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="rounded-full">Post</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
