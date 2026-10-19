import type { CategorySlug } from "@/lib/categories";

export type ParsedAskIntent = {
  category:
    | CategorySlug
    | "community"
    | "mobility"
    | "equipment"
    | "travel"
    | "food"
    | "shopping"
    | "accommodation"
    | "tickets"
    | "software";
  location: string | null;
  destination: string | null;
  date: string | null;
  time: string | null;
  people: number | null;
  budget: number | null;
  mode: "have" | "need";
  raw: string;
};

export type SmartMatchItem = {
  id: string;
  title: string;
  category: string;
  location: string | null;
  starts_at: string | null;
  total_cost: number | null;
  cost_per_person: number | null;
  capacity: number;
  match: number;
  route: string;
  peopleLabel: string;
  priceLabel: string;
};

const categoryKeywords: Record<string, string[]> = {
  mobility: ["ride", "cab", "car", "trip", "airport", "travel", "drop", "pickup", "commute"],
  accommodation: ["room", "stay", "hostel", "hotel", "stay", "flat", "pg", "house"],
  food: ["food", "lunch", "dinner", "grocery", "rice", "order", "snacks", "meal"],
  shopping: ["grocery", "rice", "shopping", "bulk", "buy", "groceries", "product"],
  travel: ["trip", "tour", "mysore", "travel", "bus", "flight"],
  tickets: ["ticket", "movie", "concert", "entry", "festival"],
  software: ["software", "subscription", "notion", "canva", "cursor", "ai", "tool"],
  equipment: ["drill", "camera", "projector", "tool", "equipment", "borrow", "laptop"],
  community: ["roommate", "group", "community", "join", "people", "split"],
};

function normalize(input: string) {
  return input.toLowerCase().trim();
}

export function parseAskIntent(input: string): ParsedAskIntent {
  const raw = input.trim();
  const lower = normalize(raw);
  const mode = /\b(i have|have|offer|available|own|can share|sharing)\b/.test(lower)
    ? "have"
    : "need";

  const budgetMatch = raw.match(/(?:rs\.?|₹|inr)\s?(\d{2,6}(?:,\d{3})*(?:\.\d{1,2})?)/i);
  const budget = budgetMatch ? Number(budgetMatch[1].replace(/,/g, "")) : null;

  const peopleMatch = raw.match(/(\d+)\s*(?:people|persons|friends|members|seats|users|guys)/i);
  const people = peopleMatch ? Number(peopleMatch[1]) : null;

  const dateMatch = raw.match(
    /(today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday|weekend|morning|evening|night)/i,
  );
  const date = dateMatch ? dateMatch[1] : null;

  let category: ParsedAskIntent["category"] = "community";
  for (const [key, words] of Object.entries(categoryKeywords)) {
    if (words.some((word) => lower.includes(word))) {
      category = key as ParsedAskIntent["category"];
      break;
    }
  }

  const locationMatch = raw.match(
    /(?:from|to|in|near|around|for|at)\s+([A-Z][A-Za-z0-9 .'-]+?)(?:\s+(?:tomorrow|today|sunday|monday|tuesday|wednesday|thursday|friday|saturday|morning|evening|night)|$)/i,
  );
  const location = locationMatch ? locationMatch[1].trim() : null;

  const destMatch = raw.match(
    /to\s+([A-Z][A-Za-z0-9 .'-]+?)(?:\s+(?:tomorrow|today|sunday|monday|tuesday|wednesday|thursday|friday|saturday|morning|evening|night)|$)/i,
  );
  const destination = destMatch ? destMatch[1].trim() : null;

  return {
    category,
    location,
    destination,
    date,
    time: /morning|evening|night|am|pm/.test(lower)
      ? (lower.match(/(morning|evening|night|[0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm))/i)?.[1] ?? null)
      : null,
    people,
    budget,
    mode,
    raw,
  };
}

export function computeSmartMatches(
  listings: Array<{
    id: string;
    title: string;
    category: string;
    location: string | null;
    starts_at: string | null;
    total_cost: number | null;
    cost_per_person: number | null;
    capacity: number;
  }>,
  requestText: string,
): SmartMatchItem[] {
  const intent = parseAskIntent(requestText);
  if (!requestText.trim()) return [];

  return listings
    .map((listing) => {
      const listingText =
        `${listing.title} ${listing.category} ${listing.location ?? ""}`.toLowerCase();
      let score = 0;
      if (intent.category && listing.category === intent.category) score += 35;
      if (
        intent.location &&
        listing.location &&
        listing.location.toLowerCase().includes(intent.location.toLowerCase())
      )
        score += 25;
      if (
        intent.destination &&
        listing.title.toLowerCase().includes(intent.destination.toLowerCase())
      )
        score += 22;
      if (intent.mode === "need" && listing.title.toLowerCase().includes("need")) score += 8;
      const terms = normalize(requestText)
        .split(/\s+/)
        .filter((word) => word.length > 3);
      for (const term of terms) {
        if (listingText.includes(term)) score += 6;
      }
      if (listing.cost_per_person != null && intent.budget) {
        const delta = Math.abs(listing.cost_per_person - intent.budget);
        if (delta <= 200) score += 10;
      }
      const route = [listing.location ?? "Local", intent.destination ?? "Your area"]
        .filter(Boolean)
        .join(" → ");
      const capacity = Math.max(1, listing.capacity || 4);
      const price =
        listing.cost_per_person ?? (listing.total_cost ? listing.total_cost / capacity : 0);
      return {
        id: listing.id,
        title: listing.title,
        category: listing.category,
        location: listing.location,
        starts_at: listing.starts_at,
        total_cost: listing.total_cost,
        cost_per_person: listing.cost_per_person,
        capacity,
        match: Math.min(98, Math.max(50, score)),
        route,
        peopleLabel: `${Math.max(1, Math.min(5, capacity - 1))} people`,
        priceLabel: `₹${Math.round(price).toLocaleString()}/person`,
      };
    })
    .filter((item) => item.match > 45)
    .sort((a, b) => b.match - a.match)
    .slice(0, 4);
}

export function calculateSplitAmount(amount: number, people: number) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const safePeople = Number.isFinite(people) && people > 0 ? people : 1;
  return {
    total: safeAmount,
    people: safePeople,
    perPerson: safeAmount / safePeople,
    rounded: Number((safeAmount / safePeople).toFixed(2)),
  };
}

export function calculateShareScore({
  successfulShares = 0,
  completedJoins = 0,
  positiveReviews = 0,
  responseRate = 0,
}: {
  successfulShares?: number;
  completedJoins?: number;
  positiveReviews?: number;
  responseRate?: number;
}) {
  const score = Math.round(
    successfulShares * 12 + completedJoins * 8 + positiveReviews * 6 + responseRate * 3,
  );
  return Math.max(0, score);
}

export function getTrustBadges({
  verified = false,
  responseRate = 0,
  positiveReviews = 0,
  successfulShares = 0,
}: {
  verified?: boolean;
  responseRate?: number;
  positiveReviews?: number;
  successfulShares?: number;
}) {
  const badges: string[] = [];
  if (verified) badges.push("Verified");
  if (responseRate >= 90) badges.push("Fast Responder");
  if (positiveReviews >= 10) badges.push("Trusted Sharer");
  if (successfulShares >= 20) badges.push("Community Helper");
  return badges;
}
