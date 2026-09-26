import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Phone } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/verify")({
  head: () => ({ meta: [{ title: "Verify your account — ShareX" }] }),
  component: VerifyPage,
});

function VerifyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  // NOTE: This is a placeholder OTP flow. Wire up an SMS provider later.
  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\+?\d{8,15}$/.test(phone.replace(/\s/g, ""))) {
      return toast.error("Enter a valid phone number");
    }
    toast.success("Demo OTP sent: use 123456");
    setStep("otp");
  };

  const verify = async () => {
    if (otp !== "123456") return toast.error("Invalid code. Use 123456 in this demo.");
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      phone_verified: true, verified: true,
    }).eq("id", user!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("You're verified ✓");
    navigate({ to: "/my" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4 mx-auto">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-center">Verify your account</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Verified members get a badge and more trust from the community.
          </p>

          {step === "phone" ? (
            <form onSubmit={sendCode} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="phone" className="mb-2 block">Phone number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98765 43210" className="pl-9" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Used only for verification — your number is never shown to other users.
                </p>
              </div>
              <Button type="submit" className="w-full rounded-full bg-[image:var(--gradient-hero)] text-white border-0">
                Send code
              </Button>
            </form>
          ) : (
            <div className="mt-6 space-y-4">
              <Label className="block text-center">Enter the 6-digit code</Label>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button onClick={verify} disabled={busy || otp.length !== 6} className="w-full rounded-full bg-[image:var(--gradient-hero)] text-white border-0">
                Verify
              </Button>
              <button type="button" onClick={() => setStep("phone")} className="w-full text-xs text-muted-foreground hover:text-foreground">
                Change number
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
