import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Calendar, Users, ArrowLeft, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/verified-badge";
import { RatingStars } from "@/components/rating-stars";
import { RatingDialog } from "@/components/rating-dialog";
import { ReportDialog } from "@/components/report-dialog";
import { CATEGORY_BY_SLUG } from "@/lib/categories";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/listings/$id")({
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const [listingRes, participantsRes] = await Promise.all([
        supabase.from("listings").select("*").eq("id", id).maybeSingle(),
        supabase.from("listing_participants").select("user_id").eq("listing_id", id),
      ]);
      if (listingRes.error) throw listingRes.error;
      let owner = null;
      let ratings: any[] = [];
      if (listingRes.data) {
        const [{ data: prof }, { data: rs }] = await Promise.all([
          supabase.from("profiles").select("id,display_name,city,verified,rating_avg,rating_count").eq("id", listingRes.data.owner_id).maybeSingle(),
          supabase.from("ratings").select("id,stars,comment,created_at,rater_id").eq("listing_id", id).order("created_at", { ascending: false }),
        ]);
        owner = prof; ratings = rs ?? [];
      }
      return { listing: listingRes.data, participants: participantsRes.data ?? [], owner, ratings };
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background"><SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!data?.listing) {
    return (
      <div className="min-h-screen bg-background"><SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Share not found</h1>
          <Link to="/browse" className="mt-4 inline-block text-primary hover:underline">Browse other shares</Link>
        </div>
      </div>
    );
  }

  const listing = data.listing;
  const cat = CATEGORY_BY_SLUG[listing.category];
  const Icon = cat?.icon;
  const isOwner = user?.id === listing.owner_id;
  const joined = data.participants.some(p => p.user_id === user?.id);
  const spotsLeft = Math.max(0, listing.capacity - data.participants.length - 1);
  const canRateOwner = !!user && (joined || isOwner === false && false); // joiners can rate owner
  const myRatingExists = data.ratings.some(r => r.rater_id === user?.id);

  const handleShare = async () => {
    const shareData = { title: listing.title, text: `Check out this share on ShareX: ${listing.title}`, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Share link copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Could not share this listing");
    }
  };

  const handleJoin = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    const { error } = await supabase.from("listing_participants").insert({
      listing_id: listing.id, user_id: user.id,
    });
    if (error) toast.error(error.message);
    else { toast.success("You've joined this share!"); qc.invalidateQueries({ queryKey: ["listing", id] }); }
  };

  const handleLeave = async () => {
    const { error } = await supabase.from("listing_participants")
      .delete().eq("listing_id", listing.id).eq("user_id", user!.id);
    if (error) toast.error(error.message);
    else { toast.success("You've left this share"); qc.invalidateQueries({ queryKey: ["listing", id] }); }
  };

  const startChat = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (isOwner) return;
    // find or create conversation
    const { data: existing } = await supabase.from("conversations")
      .select("id").eq("listing_id", listing.id).eq("joiner_id", user.id).maybeSingle();
    let convoId = existing?.id;
    if (!convoId) {
      const { data: created, error } = await supabase.from("conversations")
        .insert({ listing_id: listing.id, joiner_id: user.id, owner_id: listing.owner_id })
        .select("id").single();
      if (error) return toast.error(error.message);
      convoId = created.id;
    }
    navigate({ to: "/messages/$id", params: { id: convoId! } });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between mb-6 gap-3">
          <Link to="/browse" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to browse
          </Link>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleShare} title="Share this listing">
                <Share2 className="h-4 w-4" /> <span className="hidden sm:inline">Share</span>
              </Button>
              {!isOwner && <ReportDialog reportedListingId={listing.id} label="Report listing" />}
            </div>
        </div>

        <div className={`rounded-3xl bg-gradient-to-br ${cat?.color} p-8 sm:p-10 text-white mb-8 relative overflow-hidden`}>
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1 text-xs font-medium mb-4">
              {Icon && <Icon className="h-3.5 w-3.5" />} {cat?.label}
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{listing.title}</h1>
            {data.owner && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-white/90 text-sm">
                <span>Hosted by {data.owner.display_name}{data.owner.city && ` · ${data.owner.city}`}</span>
                {data.owner.verified && <VerifiedBadge className="bg-white/20 !text-white" />}
              </div>
            )}
            {data.owner && (
              <div className="mt-2 [&_*]:!text-white/90">
                <RatingStars value={Number(data.owner.rating_avg ?? 0)} count={data.owner.rating_count ?? 0} />
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">About this share</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {listing.location && (
                <div className="rounded-xl border border-border/60 bg-card p-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</div>
                  <div className="font-medium">{listing.location}</div>
                </div>
              )}
              {listing.starts_at && (
                <div className="rounded-xl border border-border/60 bg-card p-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> When</div>
                  <div className="font-medium">{new Date(listing.starts_at).toLocaleString()}</div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Reviews</h2>
                {canRateOwner && !myRatingExists && (
                  <RatingDialog
                    listingId={listing.id}
                    ratedUserId={listing.owner_id}
                    ratedName={data.owner?.display_name ?? "host"}
                    onRated={() => qc.invalidateQueries({ queryKey: ["listing", id] })}
                  />
                )}
              </div>
              {data.ratings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                <ul className="space-y-3">
                  {data.ratings.map(r => (
                    <li key={r.id} className="rounded-xl bg-muted/40 p-3">
                      <RatingStars value={r.stars} />
                      {r.comment && <p className="text-sm mt-1">{r.comment}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-[var(--shadow-card)]">
              {listing.cost_per_person != null && (
                <div className="mb-4">
                  <div className="text-3xl font-bold text-primary">₹{Number(listing.cost_per_person).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">per person</div>
                </div>
              )}
              {listing.total_cost != null && (
                <div className="text-sm text-muted-foreground mb-4">Total: ₹{Number(listing.total_cost).toLocaleString()}</div>
              )}
              <div className="flex items-center gap-2 text-sm mb-5">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{data.participants.length + 1} of {listing.capacity} joined · {spotsLeft} spots left</span>
              </div>
              {isOwner ? (
                <Button disabled className="w-full rounded-full">You're hosting this</Button>
              ) : joined ? (
                <Button onClick={handleLeave} variant="outline" className="w-full rounded-full">Leave share</Button>
              ) : spotsLeft === 0 ? (
                <Button disabled className="w-full rounded-full">Share is full</Button>
              ) : (
                <Button onClick={handleJoin} className="w-full rounded-full bg-[image:var(--gradient-hero)] text-white border-0 hover:opacity-95">
                  {user ? "Join this share" : "Sign in to join"}
                </Button>
              )}
              {!isOwner && (
                <Button onClick={startChat} variant="outline" className="w-full rounded-full mt-2">
                  <MessageCircle className="h-4 w-4 mr-1.5" /> Chat with host
                </Button>
              )}
              <p className="text-[10px] text-muted-foreground text-center mt-3">
                🔒 All chats are anonymous. Phone numbers stay private.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
