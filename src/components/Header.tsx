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
  organiser: "/dashboard",
  gym_owner: "/dashboard",
  fighter: "/dashboard",
  admin: "/dashboard",
  coach: "/dashboard",
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--mu-bg)] border-b border-[var(--mu-border)] md:bg-nav/90 md:backdrop-blur-xl md:border-border/50">
      <div className="container flex h-14 items-center justify-between relative">
        <Link to="/" className="flex items-center gap-2">
          <AppLogo className="h-10" />
        </Link>

        {/* Center-aligned Explore + optional links — desktop only */}
        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {!isLanding && (
            <Link
              to="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              Home
            </Link>
          )}
          {user && activeRole && (
            <Link
              to={dashboardPath}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              Dashboard
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-150">
                Explore
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-44">
              <DropdownMenuItem asChild>
                <Link to="/events" className="text-xs">View events</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/fighters" className="text-xs">View fighters</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/gyms" className="text-xs">View gyms</Link>
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
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Switch role</DropdownMenuLabel>
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
                    Account settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            <>
              <Link
                to="/auth?mode=signup"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-150 px-4 py-1.5 rounded-full"
              >
                Create account
              </Link>
              <Button variant="hero" size="sm" className="rounded-full px-6" asChild>
                <Link to="/auth">Log in</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile: notification bell + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          {user && <NotificationBell />}
          <button
            className="flex flex-col justify-center items-center gap-1 w-8 h-8 group"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span className={`block h-[1.5px] bg-[var(--mu-t2)] rounded-full transition-all duration-200 ease-in-out ${mobileOpen ? 'w-5 rotate-45 translate-y-[5.5px]' : 'w-5'}`} />
            <span className={`block h-[1.5px] bg-[var(--mu-t2)] rounded-full transition-all duration-200 ease-in-out ${mobileOpen ? 'w-5 opacity-0' : 'w-5'}`} />
            <span className={`block h-[1.5px] bg-[var(--mu-t2)] rounded-full transition-all duration-200 ease-in-out ${mobileOpen ? 'w-5 -rotate-45 -translate-y-[5.5px]' : 'w-[13px] self-start ml-[6px]'}`} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--mu-border)] bg-[var(--mu-bg)]">
          <div className="container py-4 flex flex-col gap-3">
            {!isLanding && (
              <Link
                to="/"
                className="text-sm font-medium text-[var(--mu-t2)] hover:text-[var(--mu-t1)] py-2 transition-colors duration-150"
                onClick={() => setMobileOpen(false)}
              >
                Home
              </Link>
            )}
            {user && activeRole && (
              <Link
                to={dashboardPath}
                className="text-sm font-medium text-[var(--mu-t2)] hover:text-[var(--mu-t1)] py-2 transition-colors duration-150"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
            )}
            <Link to="/events" className="text-sm font-medium text-[var(--mu-t2)] hover:text-[var(--mu-t1)] py-2 transition-colors duration-150" onClick={() => setMobileOpen(false)}>View events</Link>
            <Link to="/fighters" className="text-sm font-medium text-[var(--mu-t2)] hover:text-[var(--mu-t1)] py-2 transition-colors duration-150" onClick={() => setMobileOpen(false)}>View fighters</Link>
            <Link to="/gyms" className="text-sm font-medium text-[var(--mu-t2)] hover:text-[var(--mu-t1)] py-2 transition-colors duration-150" onClick={() => setMobileOpen(false)}>View gyms</Link>
            {user && (
              <>
                <div className="mu-divider" />
                <Link
                  to="/account/settings"
                  className="text-sm font-medium text-[var(--mu-t2)] hover:text-[var(--mu-t1)] py-2 flex items-center gap-2 transition-colors duration-150"
                  onClick={() => setMobileOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Account settings
                </Link>
              </>
            )}
            <div className="flex gap-3 pt-2">
              {user ? (
                <button className="mu-btn-ghost flex items-center gap-2" onClick={() => { handleSignOut(); setMobileOpen(false); }}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              ) : (
                <>
                  <Button variant="hero" size="sm" className="rounded-full px-6" asChild>
                    <Link to="/auth" onClick={() => setMobileOpen(false)}>Log in</Link>
                  </Button>
                  <Link
                    to="/auth?mode=signup"
                    className="text-sm font-medium text-[var(--mu-t2)] hover:text-[var(--mu-t1)] transition-all duration-150 px-4 py-1.5 rounded-full"
                    onClick={() => setMobileOpen(false)}
                  >
                    Create account
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
