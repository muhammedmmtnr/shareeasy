import { Star } from "lucide-react";

export function RatingStars({
  value,
  count,
  size = 14,
}: { value: number; count?: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={i <= full ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}
          />
        ))}
      </span>
      {value > 0 ? (
        <span className="font-medium text-foreground">{Number(value).toFixed(1)}</span>
      ) : (
        <span>No ratings</span>
      )}
      {count != null && count > 0 && <span>({count})</span>}
    </span>
  );
}
