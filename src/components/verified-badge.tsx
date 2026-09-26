import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Verified user"
      className={`inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold ${className}`}
    >
      <BadgeCheck className="h-3 w-3" /> Verified
    </span>
  );
}
