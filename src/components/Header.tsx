import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, LogOut, User, Menu, X, Settings, ShoppingCart } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { NotificationBell } from "@/components/NotificationBell";
import { useState } from "react";
import { useBasket } from "@/pages/Checkout";
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
    navigate(ROLE_DASHBOARDS[role] || "/dashboard");
  };

  const ROLE_PATHS: Partial<Record<AppRole, string>> = {
    organiser: "/organiser/dashboard",
    fighter: "/fighter/dashboard",
    gym_owner: "/gym-owner/dashboard",
    coach: "/coach/dashboard",
    admin: "/admin",
  };

  const handleDashboardClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const role = data?.role as AppRole | undefined;
    navigate(role ? (ROLE_PATHS[role] ?? "/coach/dashboard") : "/coach/dashboard");
  };

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
          {user && (
            <a
              href="/dashboard"
              onClick={handleDashboardClick}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
            >
              DASHBOARD
            </a>
          )}
          <Link
            to="/explore"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 uppercase tracking-wide"
          >
            Explore
          </Link>
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

        {/* Mobile: notification bell + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          {user && <NotificationBell />}
          <button
            className="flex flex-col justify-center items-center gap-[5px] w-8 h-8 group"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span className={`block w-6 h-[2px] bg-foreground transition-all duration-250 ease-in-out ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block w-6 h-[2px] bg-foreground transition-all duration-250 ease-in-out ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-[2px] bg-foreground transition-all duration-250 ease-in-out ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="md:hidden" style={{ background: "#0d0f12" }}>
          <div className="flex flex-col">
            {user && (
              <a
                href="/dashboard"
                onClick={(e) => { handleDashboardClick(e); setMobileOpen(false); }}
                className="cursor-pointer flex items-center"
                style={{ padding: "16px 20px", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 15, color: "#e8eaf0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                DASHBOARD
              </a>
            )}
            <Link
              to="/explore"
              onClick={() => setMobileOpen(false)}
              style={{ padding: "16px 20px", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 15, color: "#e8eaf0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              EXPLORE
            </Link>

            {user && (
              <>
                <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
                <Link
                  to="/account/settings"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2"
                  style={{ padding: "16px 20px", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 15, color: "#8b909e", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <Settings style={{ width: 16, height: 16 }} />
                  ACCOUNT SETTINGS
                </Link>
                <button
                  onClick={() => { handleSignOut(); setMobileOpen(false); }}
                  className="flex items-center gap-2 w-full text-left"
                  style={{ padding: "16px 20px", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 15, color: "#ef4444", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <LogOut style={{ width: 16, height: 16 }} />
                  SIGN OUT
                </button>
              </>
            )}

            {!user && (
              <>
                <Link
                  to="/auth"
                  onClick={() => setMobileOpen(false)}
                  style={{ padding: "16px 20px", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 15, color: "#e8eaf0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  LOG IN
                </Link>
                <Link
                  to="/auth?mode=signup"
                  onClick={() => setMobileOpen(false)}
                  style={{ padding: "16px 20px", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 15, color: "#e8a020", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  CREATE ACCOUNT
                </Link>
              </>
            )}

            <div style={{ padding: 20, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#555b6b", fontFamily: "Inter, sans-serif" }}>PROMOTE, MATCHUP, DONE. IT'S THAT SIMPLE...</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
