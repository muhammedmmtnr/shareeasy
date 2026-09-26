import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatThread } from "@/components/chat-thread";
import { ReportDialog } from "@/components/report-dialog";
import { VerifiedBadge } from "@/components/verified-badge";
import { RatingStars } from "@/components/rating-stars";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/messages/$id")({
  component: Thread,
});

function Thread() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["conversation", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: c } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
      if (!c) return null;
      const otherId = c.joiner_id === user!.id ? c.owner_id : c.joiner_id;
      const [{ data: listing }, { data: other }] = await Promise.all([
        supabase.from("listings").select("id,title").eq("id", c.listing_id).maybeSingle(),
        supabase.from("profiles").select("id,display_name,verified,rating_avg,rating_count").eq("id", otherId).maybeSingle(),
      ]);
      return { c, listing, other, otherId };
    },
  });

  if (isLoading || !data || !user) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!data.c) return <div className="text-sm text-muted-foreground">Conversation not found.</div>;

  const block = async () => {
    if (!confirm("Block this user? You won't receive their messages.")) return;
    const { error } = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: data.otherId });
    if (error) return toast.error(error.message);
    toast.success("User blocked");
    navigate({ to: "/messages" });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4">
        <div>
          <Link to="/listings/$id" params={{ id: data.c.listing_id }} className="text-sm font-semibold hover:underline">
            {data.listing?.title}
          </Link>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>with {data.other?.display_name}</span>
            {data.other?.verified && <VerifiedBadge />}
          </div>
          <div className="mt-1">
            <RatingStars value={Number(data.other?.rating_avg ?? 0)} count={data.other?.rating_count ?? 0} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ReportDialog reportedUserId={data.otherId} label="Report" />
          <Button variant="ghost" size="sm" onClick={block} className="text-muted-foreground hover:text-destructive">
            <ShieldOff className="h-4 w-4 mr-1.5" /> Block
          </Button>
        </div>
      </div>
      <ChatThread conversationId={data.c.id} meId={user.id} />
    </div>
  );
}
