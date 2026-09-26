import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, LogOut, Users } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CommunityChat } from "@/components/community-chat";
import { CommunityPosts } from "@/components/community-posts";
import { VerifiedBadge } from "@/components/verified-badge";
import { KIND_BY_VALUE } from "@/routes/communities";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/communities/$id")({
  component: CommunityDetail,
});

function CommunityDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("chat");

  const { data, isLoading } = useQuery({
    queryKey: ["community", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: c } = await supabase.from("communities").select("*").eq("id", id).maybeSingle();
      if (!c) return null;
      const { data: ms } = await supabase.from("community_members").select("user_id,role,joined_at").eq("community_id", id);
      const ids = (ms ?? []).map(m => m.user_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,display_name,verified").in("id", ids)
        : { data: [] as any[] };
      const memberMap: Record<string, any> = {};
      (profs ?? []).forEach(p => { memberMap[p.id] = p; });
      const meIsMember = ids.includes(user!.id);
      return { community: c, members: ms ?? [], memberMap, meIsMember };
    },
  });

  if (isLoading || !data || !user) {
    return (
      <div className="min-h-screen bg-background"><SiteHeader />
        <div className="mx-auto max-w-5xl px-4 py-20 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!data.community) {
    return (
      <div className="min-h-screen bg-background"><SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Community not found</h1>
          <Link to="/communities" className="mt-4 inline-block text-primary hover:underline">Browse communities</Link>
        </div>
      </div>
    );
  }

  if (!data.meIsMember) {
    return (
      <div className="min-h-screen bg-background"><SiteHeader />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Members only</h1>
          <p className="text-muted-foreground mt-2">Join this community to access the chat and posts.</p>
          <Button className="mt-6 rounded-full bg-[image:var(--gradient-hero)] text-white border-0" onClick={async () => {
            const { error } = await supabase.from("community_members").insert({ community_id: id, user_id: user.id });
            if (error) return toast.error(error.message);
            qc.invalidateQueries({ queryKey: ["community", id] });
          }}>Join community</Button>
        </div>
      </div>
    );
  }

  const c = data.community;
  const k = KIND_BY_VALUE[c.kind] ?? KIND_BY_VALUE.other;
  const Icon = k.icon;

  const copyCode = () => {
    navigator.clipboard.writeText(c.join_code);
    toast.success("Invite code copied");
  };

  const leave = async () => {
    if (c.created_by === user.id) return toast.error("Creator can't leave their own community");
    if (!confirm("Leave this community?")) return;
    const { error } = await supabase.from("community_members").delete().eq("community_id", id).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-communities"] });
    navigate({ to: "/communities" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
        <Link to="/communities" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> All communities
        </Link>

        <div className={`rounded-3xl bg-gradient-to-br ${k.color} p-6 sm:p-8 text-white mb-6 relative overflow-hidden`}>
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1 text-xs font-medium mb-3">
                <Icon className="h-3.5 w-3.5" /> {k.label}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold">{c.name}</h1>
              {c.city && <p className="text-white/90 text-sm mt-1">{c.city}</p>}
              <div className="mt-2 inline-flex items-center gap-1 text-xs text-white/90">
                <Users className="h-3 w-3" /> {c.member_count} members
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyCode} variant="outline" size="sm" className="rounded-full bg-white/15 border-white/30 text-white hover:bg-white/25 hover:text-white">
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Invite · {c.join_code}
              </Button>
              {c.created_by !== user.id && (
                <Button onClick={leave} variant="outline" size="sm" className="rounded-full bg-white/15 border-white/30 text-white hover:bg-white/25 hover:text-white">
                  <LogOut className="h-3.5 w-3.5 mr-1.5" /> Leave
                </Button>
              )}
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="chat">Group chat</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4">
            <CommunityChat communityId={c.id} meId={user.id} members={data.memberMap} />
          </TabsContent>

          <TabsContent value="posts" className="mt-4">
            <CommunityPosts communityId={c.id} meId={user.id} members={data.memberMap} />
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card overflow-hidden">
              {data.members.map(m => {
                const p = data.memberMap[m.user_id];
                return (
                  <li key={m.user_id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                        {(p?.display_name ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium flex items-center gap-2">
                          {p?.display_name ?? "Member"}
                          {p?.verified && <VerifiedBadge />}
                        </div>
                        <div className="text-[11px] text-muted-foreground">Joined {new Date(m.joined_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    {m.role === "admin" && (
                      <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">Admin</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
