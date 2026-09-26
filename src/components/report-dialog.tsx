import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const REASONS = ["Spam or scam", "Inappropriate content", "Harassment", "Fraud or fake listing", "Other"];

export function ReportDialog({
  reportedUserId,
  reportedListingId,
  label = "Report",
}: { reportedUserId?: string; reportedListingId?: string; label?: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return toast.error("Sign in to report");
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: reportedUserId ?? null,
      reported_listing_id: reportedListingId ?? null,
      reason,
      details: details.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Report submitted. Our team will review.");
    setOpen(false); setDetails("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
          <Flag className="h-4 w-4 mr-1.5" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report</DialogTitle>
          <DialogDescription>Help us keep ShareX safe. Reports are confidential.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Reason</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REASONS.map(r => (
                <div key={r} className="flex items-center gap-2">
                  <RadioGroupItem value={r} id={r} /><Label htmlFor={r} className="font-normal">{r}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="details" className="mb-2 block">Details (optional)</Label>
            <Textarea id="details" maxLength={500} value={details} onChange={e => setDetails(e.target.value)} placeholder="Tell us more…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>Submit report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
