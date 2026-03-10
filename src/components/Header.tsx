import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, LogOut, User, Menu, X, Settings } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { NotificationBell } from "@/components/NotificationBell";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_LABELS: Partial<Record<AppRole, string>> = {
  organiser: "Organiser",
  gym_owner: "Coach",
  fighter: "Fighter",
  admin: "Admin",
  coach: "Coach",
};

const ROLE_DASHBOARDS: Partial<Record<AppRole, string>> = {
  organiser: "/organiser/dashboard",
  gym_owner: "/gym-owner/dashboard",
  fighter: "/fighter/dashboard",
  admin: "/organiser/dashboard",
  coach: "/gym-owner/dashboard",
};

const navLinks: { label: string; to: string }[] = [];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, roles, activeRole, setActiveRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === "/";

  const { data: profile } = useQuery({
    queryKey: ["header-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, full_name")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const avatarUrl = profile?.avatar_url;
  const initials = (profile?.full_name || user?.email || "U").slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleRoleSwitch = (role: AppRole) => {
    setActiveRole(role);
    navigate(ROLE_DASHBOARDS[role] || "/");
  };

  const dashboardPath = activeRole ? (ROLE_DASHBOARDS[activeRole] || "/") : "/";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-nav/90 backdrop-blur-xl border-b border-border/50">
      <div className="container flex h-16 items-center justify-between relative">
        <Link to="/" className="flex items-center gap-2">
          <AppLogo className="h-10" />
        </Link>

        {/* Center-aligned Explore + optional links */}
        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {!isLanding && (
            <Link
              to="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              HOME
            </Link>
          )}
          {user && activeRole && (
            <Link
              to={dashboardPath}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              DASHBOARD
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 uppercase tracking-wide">
                Explore
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-44">
              <DropdownMenuItem asChild>
                <Link to="/events" className="uppercase tracking-wide text-xs">View Events</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/fighters" className="uppercase tracking-wide text-xs">View Fighters</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/gyms" className="uppercase tracking-wide text-xs">View Gyms</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="h-7 w-7">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {activeRole && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      {ROLE_LABELS[activeRole] || activeRole}
                    </span>
                  )}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {roles.length > 1 && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Role</DropdownMenuLabel>
                    {roles.map((role) => (
                      <DropdownMenuItem
                        key={role}
                        onClick={() => handleRoleSwitch(role)}
                        className={role === activeRole ? "bg-primary/10 text-primary" : ""}
                      >
                        {ROLE_LABELS[role] || role}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/account/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            <>
              <Link
                to="/auth?mode=signup"
                className="text-sm font-medium text-muted-foreground hover:text-foreground hover:shadow-[0_0_12px_hsl(var(--foreground)/0.15)] transition-all duration-200 px-4 py-1.5 rounded-full"
              >
                CREATE ACCOUNT
              </Link>
              <Button variant="hero" size="sm" className="rounded-full px-6" asChild>
                <Link to="/auth">log in</Link>
              </Button>
            </>
          )}
        </div>

        {/* Hamburger menu - three line expander */}
        <button
          className="md:hidden flex flex-col justify-center items-center gap-[5px] w-8 h-8 group"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span className={`block w-6 h-[2px] bg-foreground transition-all duration-250 ease-in-out ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
          <span className={`block w-6 h-[2px] bg-foreground transition-all duration-250 ease-in-out ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-[2px] bg-foreground transition-all duration-250 ease-in-out ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
          <div className="container py-4 flex flex-col gap-3">
            {!isLanding && (
              <Link
                to="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground py-2 uppercase tracking-wide"
                onClick={() => setMobileOpen(false)}
              >
                HOME
              </Link>
            )}
            {user && activeRole && (
              <Link
                to={dashboardPath}
                className="text-sm font-medium text-muted-foreground hover:text-foreground py-2"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
            )}
            <Link to="/events" className="text-sm font-medium text-muted-foreground hover:text-foreground py-2 uppercase tracking-wide" onClick={() => setMobileOpen(false)}>View Events</Link>
            <Link to="/fighters" className="text-sm font-medium text-muted-foreground hover:text-foreground py-2 uppercase tracking-wide" onClick={() => setMobileOpen(false)}>View Fighters</Link>
            <Link to="/gyms" className="text-sm font-medium text-muted-foreground hover:text-foreground py-2 uppercase tracking-wide" onClick={() => setMobileOpen(false)}>View Gyms</Link>
            <div className="flex gap-3 pt-2">
              {user ? (
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              ) : (
                <Button variant="hero" size="sm" className="rounded-full px-6" asChild>
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>log in</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
