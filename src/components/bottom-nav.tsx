import { Link } from "@tanstack/react-router";
import { Home, Search, Plus, Users, UserRound } from "lucide-react";

const TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/discover", label: "Discover", icon: Search },
  { to: "/new", label: "Share", icon: Plus },
  { to: "/communities", label: "Community", icon: Users },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-4 left-1/2 z-50 w-[min(94vw,26rem)] -translate-x-1/2 md:hidden">
      <ul className="flex items-center justify-between gap-1 rounded-full border border-border/60 bg-card/95 px-2 py-2 shadow-[0_16px_40px_rgba(18,34,67,0.12)] backdrop-blur-xl">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="min-w-0 flex-1">
            <Link
              to={to}
              className="flex flex-col items-center gap-0.5 rounded-full px-1 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors"
              activeProps={{ className: "bg-primary/10 text-primary" }}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
