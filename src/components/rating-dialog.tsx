import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function RatingDialog({
  listingId, ratedUserId, ratedName,
  trigger, onRated,
}: {
  listingId: string;
  ratedUserId: string;
  ratedName?: string;
  trigger?: React.ReactNode;
  onRated?: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("ratings").insert({
      listing_id: listingId, rater_id: user.id, rated_user_id: ratedUserId, stars, comment: comment.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks for your feedback!");
    setOpen(false); setComment(""); setStars(5);
    onRated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline" size="sm" className="rounded-full"><Star className="h-4 w-4 mr-1.5" /> Rate</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate {ratedName ?? "this member"}</DialogTitle>
          <DialogDescription>Your feedback helps the community build trust.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-2">
          {[1,2,3,4,5].map(i => (
            <button key={i} type="button" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} onClick={() => setStars(i)}>
              <Star className={`h-8 w-8 transition ${i <= (hover || stars) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`} />
            </button>
          ))}
        </div>
        <Textarea value={comment} maxLength={400} onChange={e => setComment(e.target.value)} placeholder="Leave a short comment (optional)" />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>Submit rating</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
