import {
  Car, Home, UtensilsCrossed, ShoppingCart, Plane, Ticket,
  Cpu, Wrench, Users, type LucideIcon
} from "lucide-react";

export type CategorySlug =
  | "mobility" | "accommodation" | "food" | "shopping"
  | "travel" | "tickets" | "software" | "equipment" | "community";

export interface Category {
  slug: CategorySlug;
  label: string;
  tagline: string;
  icon: LucideIcon;
  color: string; // tailwind class for accent stripe
  examples: string[];
}

export const CATEGORIES: Category[] = [
  { slug: "mobility", label: "Mobility", tagline: "Split rides, carpools, bike & car rentals",
    icon: Car, color: "from-orange-500 to-pink-500",
    examples: ["Taxi sharing", "Carpool", "Bike rentals", "Airport rides"] },
  { slug: "accommodation", label: "Stays", tagline: "Flatmates, hostels, hotels & villas",
    icon: Home, color: "from-pink-500 to-purple-500",
    examples: ["Flatmate finder", "Hotel splits", "PG rooms", "Vacation homes"] },
  { slug: "food", label: "Food", tagline: "Group orders, bulk deals, community kitchens",
    icon: UtensilsCrossed, color: "from-amber-500 to-orange-500",
    examples: ["Group orders", "Office lunches", "Surplus food", "Party bulk"] },
  { slug: "shopping", label: "Shopping", tagline: "Bulk groceries, electronics, wholesale",
    icon: ShoppingCart, color: "from-emerald-500 to-teal-500",
    examples: ["Bulk groceries", "Group electronics", "Wholesale produce"] },
  { slug: "travel", label: "Travel", tagline: "Trips, tours, fuel & companion matching",
    icon: Plane, color: "from-sky-500 to-indigo-500",
    examples: ["Weekend trips", "Group tours", "Solo companions", "Fuel splits"] },
  { slug: "tickets", label: "Tickets", tagline: "Movies, concerts, sports, attractions",
    icon: Ticket, color: "from-rose-500 to-red-500",
    examples: ["Movie groups", "Concert tickets", "Theme parks"] },
  { slug: "software", label: "Software", tagline: "AI tools, design, business team plans",
    icon: Cpu, color: "from-violet-500 to-fuchsia-500",
    examples: ["ChatGPT Team", "Canva Teams", "Notion", "Cursor"] },
  { slug: "equipment", label: "Equipment", tagline: "Cameras, drones, tools, event gear",
    icon: Wrench, color: "from-yellow-500 to-amber-600",
    examples: ["Cameras", "Drones", "Power tools", "Speakers"] },
  { slug: "community", label: "Community", tagline: "Apartments, colleges, offices, startups",
    icon: Users, color: "from-cyan-500 to-blue-500",
    examples: ["Apartment groups", "College pools", "Office commute"] },
];

export const CATEGORY_BY_SLUG: Record<string, Category> =
  Object.fromEntries(CATEGORIES.map(c => [c.slug, c]));
