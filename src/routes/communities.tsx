import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, GraduationCap, Briefcase, MapPin, Users, Plus, Hash, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/communities")({
  head: () => ({
    meta: [
      { title: "Communities — ShareX" },
      { name: "description", content: "Join group chats for your apartment, college, or office. Discuss, bulk-buy, share rides, run polls." },
    ],
  }),
  component: CommunitiesPage,
});

export const COMMUNITY_KINDS = [
  { value: "apartment", label: "Apartment / Society", icon: Building2, color: "from-cyan-500 to-blue-500" },
  { value: "college", label: "College / Campus", icon: GraduationCap, color: "from-violet-500 to-fuchsia-500" },
  { value: "office", label: "Office / Workplace", icon: Briefcase, color: "from-amber-500 to-orange-500" },
  { value: "neighborhood", label: "Neighborhood", icon: MapPin, color: "from-emerald-500 to-teal-500" },
  { value: "other", label: "Other", icon: Users, color: "from-slate-500 to-zinc-500" },
] as const;

export const KIND_BY_VALUE = Object.fromEntries(COMMUNITY_KINDS.map(k => [k.value, k]));

function CommunitiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data: communities } = useQuery({
    queryKey: ["communities", filter],
    queryFn: async () => {
      let q = supabase.from("communities").select("*").order("member_count", { ascending: false }).limit(100);
      if (filter !== "all") q = q.eq("kind", filter);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: myMemberships } = useQuery({
    queryKey: ["my-communities", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("community_members").select("community_id").eq("user_id", user!.id);
      return new Set((data ?? []).map(m => m.community_id));
    },
  });

  const join = async (id: string) => {
    if (!user) { navigate({ to: "/auth" }); return; }
    const { error } = await supabase.from("community_members").insert({ community_id: id, user_id: user.id });
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    toast.success("Joined community");
    qc.invalidateQueries({ queryKey: ["my-communities"] });
    qc.invalidateQueries({ queryKey: ["communities"] });
    navigate({ to: "/communities/$id", params: { id } });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="rounded-3xl bg-[image:var(--gradient-hero)] p-8 sm:p-10 text-white mb-8 relative overflow-hidden">
          <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1 text-xs font-medium mb-3">
              <Users className="h-3.5 w-3.5" /> Community Group Chat
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Your apartment, campus, and office — in one chat.</h1>
            <p className="mt-3 text-white/90">Group discussions, bulk-buy announcements, ride-sharing requests, and polls — all in your community feed.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <CreateCommunityDialog />
              <JoinByCodeDialog />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {[{ value: "all", label: "All" }, ...COMMUNITY_KINDS].map((k: any) => (
            <button key={k.value} onClick={() => setFilter(k.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition ${
                filter === k.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}>
              {k.label}
            </button>
          ))}
        </div>

        {!communities?.length ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No communities yet. Create the first one for your apartment, college, or office.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {communities.map(c => {
              const k = KIND_BY_VALUE[c.kind] ?? KIND_BY_VALUE.other;
              const Icon = k.icon;
              const joined = myMemberships?.has(c.id);
              return (
                <div key={c.id} className="rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col">
                  <div className={`h-2 w-full bg-gradient-to-r ${k.color}`} />
                  <div className="p-5 flex-1 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        <Icon className="h-3 w-3" /> {k.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" /> {c.member_count}
                      </span>
                    </div>
                    <h3 className="font-semibold leading-tight">{c.name}</h3>
                    {c.city && <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.city}</p>}
                    {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                    <div className="mt-auto pt-2">
                      {joined ? (
                        <Button asChild variant="outline" className="w-full rounded-full">
                          <Link to="/communities/$id" params={{ id: c.id }}>Open chat</Link>
                        </Button>
                      ) : (
                        <Button onClick={() => join(c.id)} className="w-full rounded-full bg-[image:var(--gradient-hero)] text-white border-0">
                          Join community
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateCommunityDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>("apartment");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!name.trim()) return toast.error("Give your community a name");
    setBusy(true);
    const { data, error } = await supabase.from("communities").insert({
      name: name.trim(), kind, city: city.trim() || null,
      description: description.trim() || null, created_by: user.id,
    }).select("id").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Community created");
    qc.invalidateQueries({ queryKey: ["communities"] });
    qc.invalidateQueries({ queryKey: ["my-communities"] });
    setOpen(false);
    navigate({ to: "/communities/$id", params: { id: data.id } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full bg-white text-foreground hover:bg-white/90 border-0">
          <Plus className="h-4 w-4 mr-1.5" /> Create community
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a community</DialogTitle>
          <DialogDescription>Start a group chat for your apartment, campus, office, or neighborhood.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="mb-2 block">Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Prestige Lakeview Block A" maxLength={80} />
          </div>
          <div>
            <Label className="mb-2 block">Type</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMUNITY_KINDS.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="city" className="mb-2 block">City (optional)</Label>
            <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="Bengaluru" maxLength={60} />
          </div>
          <div>
            <Label htmlFor="desc" className="mb-2 block">Description (optional)</Label>
            <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="A short note about this community" maxLength={300} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="rounded-full">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function JoinByCodeDialog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate({ to: "/auth" }); return; }
    setBusy(true);
    const { data: c } = await supabase.from("communities").select("id").eq("join_code", code.trim().toLowerCase()).maybeSingle();
    if (!c) { setBusy(false); return toast.error("No community with that code"); }
    const { error } = await supabase.from("community_members").insert({ community_id: c.id, user_id: user.id });
    setBusy(false);
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    toast.success("Joined!");
    qc.invalidateQueries({ queryKey: ["my-communities"] });
    setOpen(false);
    navigate({ to: "/communities/$id", params: { id: c.id } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white">
          <KeyRound className="h-4 w-4 mr-1.5" /> Join by code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join with an invite code</DialogTitle>
          <DialogDescription>Got a code from a neighbor or classmate? Drop it in.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="code" className="mb-2 block">Invite code</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="code" value={code} onChange={e => setCode(e.target.value)} placeholder="abc12345" className="pl-9 font-mono" maxLength={20} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy || !code.trim()} className="rounded-full">Join</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
