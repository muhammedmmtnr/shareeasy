import { Link } from "@tanstack/react-router";
import { MapPin, Users, Calendar, Share2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_BY_SLUG } from "@/lib/categories";

export interface ListingCardData {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  starts_at: string | null;
  total_cost: number | null;
  cost_per_person: number | null;
  capacity: number;
  status: string;
  image_url: string | null;
  participant_count?: number;
}

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const cat = CATEGORY_BY_SLUG[listing.category];
  const Icon = cat?.icon;
  const joined = Math.max(1, listing.participant_count ?? 2);
  const capacity = Math.max(2, listing.capacity || 4);
  const shareAmount =
    listing.cost_per_person ?? Math.max(0, (listing.total_cost ?? 0) / Math.max(1, capacity));
  const progress = Math.min(100, (joined / capacity) * 100);
  const left = Math.max(0, capacity - joined);

  return (
    <article className="group relative overflow-hidden rounded-[26px] border border-border/60 bg-card p-4 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.2)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-card)]">
      <div
        className={`h-2 w-full rounded-full bg-gradient-to-r ${cat?.color ?? "from-primary to-accent"}`}
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {Icon && <Icon className="h-3 w-3" />} {cat?.label ?? listing.category}
        </span>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Share this listing"
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <Link to="/listings/$id" params={{ id: listing.id }} className="mt-4 block">
        <h3 className="text-xl font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
          {listing.title}
        </h3>
      </Link>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        <span>{listing.location ?? "Location flexible"}</span>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <span>
          {listing.starts_at
            ? new Date(listing.starts_at).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            : "Flexible timing"}
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-black tracking-tight text-primary">
            ₹{Number(shareAmount).toLocaleString()}
            <span className="ml-1 text-xs font-medium text-muted-foreground">/person</span>
          </div>
          {listing.total_cost != null && (
            <div className="mt-1 text-xs text-muted-foreground line-through">
              Normal ₹{Number(listing.total_cost).toLocaleString()}
            </div>
          )}
        </div>
        <div className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
          Save ₹
          {Math.max(
            0,
            Number(listing.total_cost ?? 0) - Number(shareAmount) * Math.max(1, capacity),
          ).toLocaleString()}
        </div>
      </div>

      <div className="mt-4 flex -space-x-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <span
            key={idx}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-[9px] font-bold ${idx % 2 === 0 ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}
          >
            {idx === 0 ? "M" : idx === 1 ? "A" : idx === 2 ? "R" : "S"}
          </span>
        ))}
        <span className="ml-2 inline-flex items-center text-xs font-medium text-muted-foreground">
          +{Math.max(0, joined - 4)} joined
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {joined} / {capacity} joined
          </span>
          <span>
            {left} seat{left === 1 ? "" : "s"} left
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium text-foreground/90">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Verified
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700">
            ⭐ 782
          </span>
        </div>
        <Button
          asChild
          size="sm"
          className="rounded-full bg-[image:var(--gradient-hero)] text-white border-0 hover:opacity-95 px-4"
        >
          <Link to="/listings/$id" params={{ id: listing.id }}>
            Join share
          </Link>
        </Button>
      </div>
    </article>
  );
}
