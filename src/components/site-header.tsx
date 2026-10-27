import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, LogOut, User as UserIcon, MessageCircle, ShieldCheck, Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src="/shareeasy-official-logo.jpg"
            alt="ShareCheya"
            className="h-12 sm:h-14 w-auto object-contain group-hover:scale-105 transition-transform drop-shadow-[0_12px_28px_rgba(14,116,144,0.18)]"
          />
          <span className="sr-only">ShareCheya — Share Anything. Save Everything.</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/discover"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            activeProps={{ className: "text-foreground" }}
          >
            Discover
          </Link>
          <Link
            to="/pulse"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            activeProps={{ className: "text-foreground" }}
          >
            Pulse
          </Link>
          <Link
            to="/map"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            activeProps={{ className: "text-foreground" }}
          >
            Near Me
          </Link>
          <Link
            to="/commitment-clock"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            activeProps={{ className: "text-foreground" }}
          >
            Timers
          </Link>
          <Link
            to="/communities"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            activeProps={{ className: "text-foreground" }}
          >
            Communities
          </Link>
          <Link
            to="/browse"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            activeProps={{ className: "text-foreground" }}
          >
            Deals
          </Link>
          <Link
            to="/how-it-works"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            activeProps={{ className: "text-foreground" }}
          >
            How it works
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button
                asChild
                size="icon"
                variant="ghost"
                className="rounded-full"
                title="Notifications"
              >
                <Link to="/activity">
                  <Bell className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="icon" variant="ghost" className="rounded-full" title="Messages">
                <Link to="/messages">
                  <MessageCircle className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="rounded-full bg-[image:var(--gradient-hero)] text-white hover:opacity-95 border-0"
              >
                <Link to="/new">
                  <Plus className="h-4 w-4 mr-1" /> Post a share
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" className="rounded-full">
                    <UserIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/my">My shares</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/messages">Messages</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/verify">
                      <ShieldCheck className="h-4 w-4 mr-2" /> Get verified
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="rounded-full bg-[image:var(--gradient-hero)] text-white border-0 hover:opacity-95"
              >
                <Link to="/auth">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
