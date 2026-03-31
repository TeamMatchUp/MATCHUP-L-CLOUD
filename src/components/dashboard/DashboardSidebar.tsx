import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Building2,
  Users,
  Zap,
  Calendar,
  Bell,
  Settings,
  LogOut,
  User,
  BarChart3,
  Heart,
  Home,
  Compass,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  FolderOpen,
  CreditCard,
  Swords,
  MapPin,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface DashboardSidebarProps {
  pendingCount: number;
  unreadCount: number;
  actionsCount?: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItemDef {
  key: string;
  label: string;
  icon: any;
  badgeCount?: number;
  isAccordion?: boolean;
  children?: { key: string; label: string; icon?: any; to?: string }[];
}

export function DashboardSidebar({ pendingCount, unreadCount, actionsCount = 0, collapsed, onToggleCollapse }: DashboardSidebarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get("section") || "overview";
  const { user, effectiveRoles, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  const isCoachOrOwner = effectiveRoles.includes("gym_owner" as AppRole) || effectiveRoles.includes("coach" as AppRole);
  const isOrganiser = effectiveRoles.includes("organiser" as AppRole);
  const isFighter = effectiveRoles.includes("fighter" as AppRole);

  const { data: profile } = useQuery({
    queryKey: ["dash-sidebar-profile", user?.id],
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

  const initials = (profile?.full_name || user?.email || "U").slice(0, 2).toUpperCase();

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Build role-specific nav items
  const getMenuItems = (): NavItemDef[] => {
    if (isCoachOrOwner) {
      return [
        { key: "overview", label: "Overview", icon: LayoutDashboard },
        { key: "analytics", label: "Analytics", icon: BarChart3 },
        {
          key: "manage", label: "Manage", icon: FolderOpen, isAccordion: true,
          children: [
            { key: "gyms", label: "My Gyms" },
            { key: "events", label: "My Events" },
            { key: "my-profile", label: "My Profile" },
          ],
        },
        { key: "roster", label: "Roster", icon: Users },
        { key: "interests", label: "Interests", icon: Heart },
        { key: "actions", label: "Actions", icon: Zap, badgeCount: actionsCount },
        { key: "notifications", label: "Notifications", icon: Bell, badgeCount: unreadCount },
        {
          key: "explore", label: "Explore", icon: Compass, isAccordion: true,
          children: [
            { key: "explore-gyms", label: "Gyms", to: "/explore?tab=gyms" },
            { key: "explore-events", label: "Events", to: "/explore?tab=events" },
            { key: "explore-fighters", label: "Fighters", to: "/explore?tab=fighters" },
          ],
        },
      ];
    }
    if (isFighter) {
      return [
        { key: "overview", label: "Overview", icon: LayoutDashboard },
        { key: "my-profile", label: "My Profile", icon: User },
        { key: "interests", label: "Interests", icon: Heart },
        { key: "actions", label: "Actions", icon: Zap, badgeCount: actionsCount },
        { key: "analytics", label: "Analytics", icon: BarChart3 },
        { key: "notifications", label: "Notifications", icon: Bell, badgeCount: unreadCount },
        {
          key: "explore", label: "Explore", icon: Compass, isAccordion: true,
          children: [
            { key: "explore-gyms", label: "Gyms", to: "/explore?tab=gyms" },
            { key: "explore-events", label: "Events", to: "/explore?tab=events" },
            { key: "explore-fighters", label: "Fighters", to: "/explore?tab=fighters" },
          ],
        },
      ];
    }
    if (isOrganiser) {
      return [
        { key: "overview", label: "Overview", icon: LayoutDashboard },
        { key: "actions", label: "Actions", icon: Zap, badgeCount: actionsCount },
        { key: "events", label: "My Events", icon: Calendar },
        { key: "analytics", label: "Analytics", icon: BarChart3 },
        { key: "notifications", label: "Notifications", icon: Bell, badgeCount: unreadCount },
        {
          key: "explore", label: "Explore", icon: Compass, isAccordion: true,
          children: [
            { key: "explore-gyms", label: "Gyms", to: "/explore?tab=gyms" },
            { key: "explore-events", label: "Events", to: "/explore?tab=events" },
            { key: "explore-fighters", label: "Fighters", to: "/explore?tab=fighters" },
          ],
        },
      ];
    }
    // Default
    return [
      { key: "overview", label: "Overview", icon: LayoutDashboard },
      { key: "actions", label: "Actions", icon: Zap, badgeCount: actionsCount },
      { key: "analytics", label: "Analytics", icon: BarChart3 },
      { key: "notifications", label: "Notifications", icon: Bell, badgeCount: unreadCount },
    ];
  };

  const menuItems = getMenuItems();

  const handleNav = (key: string) => {
    setSearchParams({ section: key });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isDark = theme === "dark";

  const renderNavItem = (item: NavItemDef) => {
    if (item.isAccordion && item.children) {
      const isOpen = openAccordions[item.key] ?? false;
      const childActive = item.children.some((c) => activeSection === c.key);
      return (
        <div key={item.key}>
          <button
            className="w-full flex items-center gap-2.5 rounded-lg transition-all duration-150"
            style={{
              padding: "7px 12px",
              margin: "1px 0",
              fontSize: 13,
              fontWeight: childActive ? 600 : 500,
              color: childActive ? "#e8a020" : "#8b909e",
              background: childActive ? "rgba(232,160,32,0.12)" : "transparent",
            }}
            onClick={() => toggleAccordion(item.key)}
          >
            <item.icon style={{ width: 16, height: 16 }} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown
                  style={{
                    width: 14, height: 14, color: "#555b6b",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </>
            )}
          </button>
          {!collapsed && (
            <div
              style={{
                maxHeight: isOpen ? 200 : 0,
                overflow: "hidden",
                transition: "max-height 0.25s ease",
              }}
            >
              {item.children.map((child) => {
                const isActive = activeSection === child.key;
                if (child.to) {
                  return (
                    <Link
                      key={child.key}
                      to={child.to}
                      className="block transition-colors duration-150"
                      style={{
                        paddingLeft: 40,
                        padding: "5px 12px 5px 40px",
                        fontSize: 12,
                        color: isActive ? "#e8a020" : "#8b909e",
                        borderRadius: 8,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#e8eaf0"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = isActive ? "#e8a020" : "#8b909e"; e.currentTarget.style.background = "transparent"; }}
                    >
                      {child.label}
                    </Link>
                  );
                }
                return (
                  <button
                    key={child.key}
                    className="w-full text-left transition-colors duration-150"
                    style={{
                      paddingLeft: 40,
                      padding: "5px 12px 5px 40px",
                      fontSize: 12,
                      color: isActive ? "#e8a020" : "#8b909e",
                      borderRadius: 8,
                    }}
                    onClick={() => handleNav(child.key)}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#e8eaf0"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = isActive ? "#e8a020" : "#8b909e"; e.currentTarget.style.background = "transparent"; }}
                  >
                    {child.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    const isActive = activeSection === item.key;
    return (
      <button
        key={item.key}
        className="w-full flex items-center gap-2.5 rounded-lg transition-all duration-150"
        style={{
          padding: "7px 12px",
          margin: "1px 0",
          fontSize: 13,
          fontWeight: isActive ? 600 : 500,
          color: isActive ? "#e8a020" : "#8b909e",
          background: isActive ? "rgba(232,160,32,0.12)" : "transparent",
        }}
        onClick={() => handleNav(item.key)}
        onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#e8eaf0"; } }}
        onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8b909e"; } }}
      >
        <item.icon style={{ width: 16, height: 16 }} />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badgeCount && item.badgeCount > 0 ? (
              <span
                style={{
                  background: "#ef4444",
                  color: "white",
                  fontSize: 10,
                  fontWeight: 700,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 5px",
                }}
              >
                {item.badgeCount}
              </span>
            ) : null}
          </>
        )}
      </button>
    );
  };

  const settingsOpen = openAccordions["settings"] ?? false;

  return (
    <div
      className="relative shrink-0 flex flex-col"
      style={{
        width: collapsed ? 0 : 220,
        transition: "width 0.2s ease",
        overflow: "hidden",
        borderRight: collapsed ? "none" : "1px solid rgba(255,255,255,0.06)",
        background: "#0d0f12",
      }}
    >
      {/* Collapse toggle tab - sits on right edge */}
      <button
        onClick={onToggleCollapse}
        className="absolute top-1/2 -translate-y-1/2 z-50 flex items-center justify-center transition-colors"
        style={{
          right: collapsed ? -20 : -20,
          width: 20,
          height: 48,
          background: "#1a1e28",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "0 6px 6px 0",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#242938"; (e.currentTarget.firstChild as any).style.color = "#e8a020"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#1a1e28"; (e.currentTarget.firstChild as any).style.color = "#8b909e"; }}
      >
        {collapsed ? (
          <ChevronRight style={{ width: 12, height: 12, color: "#8b909e", transition: "color 0.15s" }} />
        ) : (
          <ChevronLeft style={{ width: 12, height: 12, color: "#8b909e", transition: "color 0.15s" }} />
        )}
      </button>

      {/* User Profile at TOP */}
      <div style={{ padding: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2.5">
          <Avatar className="h-9 w-9 shrink-0" style={{ border: "2px solid rgba(232,160,32,0.3)" }}>
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} className="object-cover" />}
            <AvatarFallback
              className="text-sm font-medium"
              style={{ background: "linear-gradient(135deg, #e8a020, #c47e10)", color: "white" }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0" }}>
              {profile?.full_name || "User"}
            </p>
            <p className="truncate" style={{ fontSize: 11, color: "#8b909e", marginTop: 1 }}>
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ margin: "8px 12px" }}>
        <div
          className="flex items-center gap-2 transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
            padding: "8px 12px",
          }}
        >
          <Search style={{ width: 14, height: 14, color: "#555b6b", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent outline-none border-none"
            style={{ fontSize: 13, color: "#e8eaf0" }}
          />
        </div>
      </div>

      {/* Scrollable nav content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "0 8px" }}>
        {/* MENU section */}
        <p style={{ padding: "14px 8px 4px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555b6b" }}>
          MENU
        </p>
        {menuItems.map(renderNavItem)}

        {/* GENERAL section */}
        <p style={{ padding: "14px 8px 4px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555b6b" }}>
          GENERAL
        </p>

        {/* Homepage */}
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-lg transition-all duration-150"
          style={{ padding: "7px 12px", margin: "1px 0", fontSize: 13, fontWeight: 500, color: "#8b909e" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#e8eaf0"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8b909e"; }}
        >
          <Home style={{ width: 16, height: 16 }} />
          <span>Homepage</span>
        </Link>

        {/* Settings Accordion */}
        <div>
          <button
            className="w-full flex items-center gap-2.5 rounded-lg transition-all duration-150"
            style={{ padding: "7px 12px", margin: "1px 0", fontSize: 13, fontWeight: 500, color: "#8b909e" }}
            onClick={() => toggleAccordion("settings")}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#e8eaf0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8b909e"; }}
          >
            <Settings style={{ width: 16, height: 16 }} />
            <span className="flex-1 text-left">Settings</span>
            <ChevronDown
              style={{
                width: 14, height: 14, color: "#555b6b",
                transform: settingsOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </button>
          <div
            style={{
              maxHeight: settingsOpen ? 200 : 0,
              overflow: "hidden",
              transition: "max-height 0.25s ease",
            }}
          >
            {/* Dark Mode */}
            <div
              className="flex items-center justify-between"
              style={{ padding: "5px 12px 5px 40px", fontSize: 12, color: "#8b909e" }}
            >
              <span>Dark Mode</span>
              <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                className="data-[state=checked]:bg-primary"
                style={{ transform: "scale(0.8)" }}
              />
            </div>
            {/* Profile Settings */}
            <Link
              to="/account/settings"
              className="block transition-colors duration-150"
              style={{ padding: "5px 12px 5px 40px", fontSize: 12, color: "#8b909e", borderRadius: 8 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#e8eaf0"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#8b909e"; e.currentTarget.style.background = "transparent"; }}
            >
              Profile Settings
            </Link>
            {/* Billing */}
            <button
              className="w-full text-left transition-colors duration-150"
              style={{ padding: "5px 12px 5px 40px", fontSize: 12, color: "#8b909e", borderRadius: 8 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#e8eaf0"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#8b909e"; e.currentTarget.style.background = "transparent"; }}
            >
              Billing
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          className="w-full flex items-center gap-2.5 rounded-lg transition-all duration-150"
          style={{ padding: "7px 12px", margin: "1px 0", fontSize: 13, fontWeight: 500, color: "#ef4444" }}
          onClick={handleSignOut}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <LogOut style={{ width: 16, height: 16 }} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
