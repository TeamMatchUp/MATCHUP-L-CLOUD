import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronDown, LogOut, User, Menu, X } from "lucide-react";
import logoFull from "@/assets/logo-full.webp";
import { NotificationBell } from "@/components/NotificationBell";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoFull} alt="MatchUp" className="h-10" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            Home
          </Link>
          {user && activeRole && (
            <Link
              to={dashboardPath}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Dashboard
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
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
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            <Button variant="hero" size="sm" className="rounded-full px-6" asChild>
              <Link to="/auth">log in</Link>
            </Button>
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
            <Link
              to="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground py-2"
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>
            {user && activeRole && (
              <Link
                to={dashboardPath}
                className="text-sm font-medium text-muted-foreground hover:text-foreground py-2"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
            )}
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
