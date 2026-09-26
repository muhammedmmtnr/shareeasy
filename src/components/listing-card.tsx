import { Link } from "@tanstack/react-router";
import { MapPin, Users, Calendar } from "lucide-react";
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
  const joined = listing.participant_count ?? 0;
  const left = Math.max(0, listing.capacity - joined - 1); // -1 owner

  return (
    <Link
      to="/listings/$id"
      params={{ id: listing.id }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:shadow-[var(--shadow-card)] hover:-translate-y-0.5"
    >
      <div className={`h-2 w-full bg-gradient-to-r ${cat?.color ?? "from-primary to-accent"}`} />
      <div className="flex flex-col gap-3 p-5 flex-1">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {Icon && <Icon className="h-3 w-3" />} {cat?.label ?? listing.category}
          </span>
          {listing.cost_per_person != null && (
            <span className="text-sm font-bold text-primary">
              ₹{Number(listing.cost_per_person).toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/person</span>
            </span>
          )}
        </div>
        <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {listing.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{listing.description}</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t border-border/60">
          {listing.location && (
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {listing.location}</span>
          )}
          {listing.starts_at && (
            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />
              {new Date(listing.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
          <span className="inline-flex items-center gap-1 ml-auto">
            <Users className="h-3 w-3" /> {left > 0 ? `${left} spots left` : "Full"}
          </span>
        </div>
      </div>
    </Link>
  );
}
