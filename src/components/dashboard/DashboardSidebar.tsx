import { useState } from "react";
import iconWhite from "@/assets/icon-white.svg";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, Building2, Users, Zap, Calendar, Bell, Settings, LogOut,
  User, BarChart3, Heart, Home, Compass, ChevronDown, PanelLeftClose, PanelLeft,
  Search, FolderOpen, Swords,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

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
      const { data } = await supabase.from("profiles").select("avatar_url, full_name").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const initials = (profile?.full_name || user?.email || "U").slice(0, 2).toUpperCase();
  const isDark = theme === "dark";

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getMenuItems = (): NavItemDef[] => {
    if (isCoachOrOwner) {
      return [
        { key: "overview", label: "Overview", icon: LayoutDashboard },
        { key: "analytics", label: "Analytics", icon: BarChart3 },
        { key: "manage", label: "Manage", icon: FolderOpen, isAccordion: true, children: [
          { key: "gyms", label: "My Gyms" }, { key: "events", label: "My Events" }, { key: "my-profile", label: "My Profile" },
        ]},
        { key: "roster", label: "Roster", icon: Users },
        { key: "interests", label: "Interests", icon: Heart },
        { key: "actions", label: "Actions", icon: Zap, badgeCount: actionsCount },
        { key: "notifications", label: "Notifications", icon: Bell, badgeCount: unreadCount },
        { key: "explore", label: "Explore", icon: Compass, isAccordion: true, children: [
          { key: "explore-gyms", label: "Gyms", to: "/explore/gyms" },
          { key: "explore-events", label: "Events", to: "/explore/events" },
          { key: "explore-fighters", label: "Fighters", to: "/explore/fighters" },
        ]},
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
        { key: "explore", label: "Explore", icon: Compass, isAccordion: true, children: [
          { key: "explore-gyms", label: "Gyms", to: "/explore/gyms" },
          { key: "explore-events", label: "Events", to: "/explore/events" },
          { key: "explore-fighters", label: "Fighters", to: "/explore/fighters" },
        ]},
      ];
    }
    if (isOrganiser) {
      return [
        { key: "overview", label: "Overview", icon: LayoutDashboard },
        { key: "actions", label: "Actions", icon: Zap, badgeCount: actionsCount },
        { key: "events", label: "My Events", icon: Calendar },
        { key: "analytics", label: "Analytics", icon: BarChart3 },
        { key: "notifications", label: "Notifications", icon: Bell, badgeCount: unreadCount },
        { key: "explore", label: "Explore", icon: Compass, isAccordion: true, children: [
          { key: "explore-gyms", label: "Gyms", to: "/explore/gyms" },
          { key: "explore-events", label: "Events", to: "/explore/events" },
          { key: "explore-fighters", label: "Fighters", to: "/explore/fighters" },
        ]},
      ];
    }
    return [
      { key: "overview", label: "Overview", icon: LayoutDashboard },
      { key: "actions", label: "Actions", icon: Zap, badgeCount: actionsCount },
      { key: "analytics", label: "Analytics", icon: BarChart3 },
      { key: "notifications", label: "Notifications", icon: Bell, badgeCount: unreadCount },
    ];
  };

  const menuItems = getMenuItems();
  const handleNav = (key: string) => setSearchParams({ section: key });
  const handleSignOut = async () => { await signOut(); navigate("/"); };
  const settingsOpen = openAccordions["settings"] ?? false;

  const sidebarWidth = collapsed ? 56 : 220;

  const renderNavItem = (item: NavItemDef) => {
    if (item.isAccordion && item.children) {
      const isOpen = openAccordions[item.key] ?? false;
      const childActive = item.children.some((c) => activeSection === c.key);

      if (collapsed) {
        return (
          <TooltipProvider key={item.key} delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="w-full flex items-center justify-center rounded-lg transition-all duration-150"
                  style={{ padding: "7px 0", margin: "1px 0", color: childActive ? "#e8a020" : "#8b909e", background: childActive ? "rgba(232,160,32,0.12)" : "transparent" }}
                  onClick={() => toggleAccordion(item.key)}
                >
                  <item.icon style={{ width: 16, height: 16 }} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#1a1e28] text-[#e8eaf0] border-[rgba(255,255,255,0.1)]">
                {item.label}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      return (
        <div key={item.key}>
          <button
            className="w-full flex items-center gap-2.5 rounded-lg transition-all duration-150"
            style={{ padding: "7px 12px", margin: "1px 0", fontSize: 13, fontWeight: childActive ? 600 : 500, color: childActive ? "#e8a020" : "#8b909e", background: childActive ? "rgba(232,160,32,0.12)" : "transparent" }}
            onClick={() => toggleAccordion(item.key)}
          >
            <item.icon style={{ width: 16, height: 16 }} />
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronDown style={{ width: 14, height: 14, color: "#555b6b", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
          </button>
          <div style={{ maxHeight: isOpen ? 200 : 0, overflow: "hidden", transition: "max-height 0.25s ease" }}>
            {item.children.map((child) => {
              const isActive = activeSection === child.key;
              if (child.to) {
                return (
                  <Link key={child.key} to={child.to} className="block transition-colors duration-150"
                    style={{ padding: "5px 12px 5px 40px", fontSize: 12, color: isActive ? "#e8a020" : "#8b909e", borderRadius: 8 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#e8eaf0"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = isActive ? "#e8a020" : "#8b909e"; e.currentTarget.style.background = "transparent"; }}
                  >{child.label}</Link>
                );
              }
              return (
                <button key={child.key} className="w-full text-left transition-colors duration-150"
                  style={{ padding: "5px 12px 5px 40px", fontSize: 12, color: isActive ? "#e8a020" : "#8b909e", borderRadius: 8 }}
                  onClick={() => handleNav(child.key)}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#e8eaf0"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = isActive ? "#e8a020" : "#8b909e"; e.currentTarget.style.background = "transparent"; }}
                >{child.label}</button>
              );
            })}
          </div>
        </div>
      );
    }

    const isActive = activeSection === item.key;

    if (collapsed) {
      return (
        <TooltipProvider key={item.key} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="w-full flex items-center justify-center rounded-lg transition-all duration-150 relative"
                style={{ padding: "7px 0", margin: "1px 0", color: isActive ? "#e8a020" : "#8b909e", background: isActive ? "rgba(232,160,32,0.12)" : "transparent" }}
                onClick={() => handleNav(item.key)}
              >
                <item.icon style={{ width: 16, height: 16 }} />
                {item.badgeCount && item.badgeCount > 0 && (
                  <span style={{ position: "absolute", top: 2, right: 8, background: "#ef4444", color: "white", fontSize: 8, fontWeight: 700, minWidth: 14, height: 14, borderRadius: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                    {item.badgeCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#1a1e28] text-[#e8eaf0] border-[rgba(255,255,255,0.1)]">
              {item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <button key={item.key} className="w-full flex items-center gap-2.5 rounded-lg transition-all duration-150"
        style={{ padding: "7px 12px", margin: "1px 0", fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? "#e8a020" : "#8b909e", background: isActive ? "rgba(232,160,32,0.12)" : "transparent" }}
        onClick={() => handleNav(item.key)}
        onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#e8eaf0"; } }}
        onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8b909e"; } }}
      >
        <item.icon style={{ width: 16, height: 16 }} />
        <span className="flex-1 text-left">{item.label}</span>
        {item.badgeCount && item.badgeCount > 0 ? (
          <span style={{ background: "#ef4444", color: "white", fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
            {item.badgeCount}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div
      className="relative shrink-0 flex flex-col"
      style={{
        width: sidebarWidth,
        transition: "width 0.2s ease",
        overflow: "hidden",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        background: "#0d0f12",
        position: "sticky",
        top: 0,
        height: "100vh",
      }}
    >
      {/* Logo + collapse at TOP */}
      <div style={{ padding: collapsed ? "16px 8px 12px" : "16px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <img src={iconWhite} alt="Matchup" style={{ height: 28, width: "auto" }} />
            <button
              onClick={onToggleCollapse}
              className="flex items-center justify-center transition-colors"
              style={{ width: 28, height: 28, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            >
              <PanelLeft style={{ width: 14, height: 14, color: "#8b909e" }} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src={iconWhite} alt="Matchup" style={{ height: 28, width: "auto" }} />
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: "#e8eaf0", letterSpacing: "0.08em", marginLeft: 8 }}>MATCHUP</span>
            </div>
            <button
              onClick={onToggleCollapse}
              className="flex items-center justify-center transition-colors"
              style={{ width: 28, height: 28, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            >
              <PanelLeftClose style={{ width: 14, height: 14, color: "#8b909e" }} />
            </button>
          </div>
        )}
      </div>

      {/* Search Bar - hidden when collapsed */}
      {!collapsed && (
        <div style={{ margin: "8px 12px", flexShrink: 0 }}>
          <div className="flex items-center gap-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 12px" }}>
            <Search style={{ width: 14, height: 14, color: "#555b6b", flexShrink: 0 }} />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent outline-none border-none" style={{ fontSize: 13, color: "#e8eaf0" }} />
          </div>
        </div>
      )}

      {/* Scrollable nav content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: collapsed ? "0 4px" : "0 8px" }}>
        {!collapsed && (
          <p style={{ padding: "14px 8px 4px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555b6b" }}>MENU</p>
        )}
        {menuItems.map(renderNavItem)}

        {!collapsed && (
          <p style={{ padding: "14px 8px 4px", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555b6b" }}>GENERAL</p>
        )}

        {/* Homepage */}
        {collapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/" className="flex items-center justify-center rounded-lg transition-all duration-150" style={{ padding: "7px 0", margin: "1px 0", color: "#8b909e" }}>
                  <Home style={{ width: 16, height: 16 }} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#1a1e28] text-[#e8eaf0] border-[rgba(255,255,255,0.1)]">Homepage</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Link to="/" className="flex items-center gap-2.5 rounded-lg transition-all duration-150"
            style={{ padding: "7px 12px", margin: "1px 0", fontSize: 13, fontWeight: 500, color: "#8b909e" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#e8eaf0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8b909e"; }}
          >
            <Home style={{ width: 16, height: 16 }} />
            <span>Homepage</span>
          </Link>
        )}

        {/* Settings Accordion */}
        {collapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/account/settings" className="flex items-center justify-center rounded-lg transition-all duration-150" style={{ padding: "7px 0", margin: "1px 0", color: "#8b909e" }}>
                  <Settings style={{ width: 16, height: 16 }} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#1a1e28] text-[#e8eaf0] border-[rgba(255,255,255,0.1)]">Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div>
            <button className="w-full flex items-center gap-2.5 rounded-lg transition-all duration-150"
              style={{ padding: "7px 12px", margin: "1px 0", fontSize: 13, fontWeight: 500, color: "#8b909e" }}
              onClick={() => toggleAccordion("settings")}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#e8eaf0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8b909e"; }}
            >
              <Settings style={{ width: 16, height: 16 }} />
              <span className="flex-1 text-left">Settings</span>
              <ChevronDown style={{ width: 14, height: 14, color: "#555b6b", transform: settingsOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </button>
            <div style={{ maxHeight: settingsOpen ? 200 : 0, overflow: "hidden", transition: "max-height 0.25s ease" }}>
              <div className="flex items-center justify-between" style={{ padding: "5px 12px 5px 40px", fontSize: 12, color: "#8b909e" }}>
                <span>Dark Mode</span>
                <Switch checked={isDark} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} className="data-[state=checked]:bg-primary" style={{ transform: "scale(0.8)" }} />
              </div>
              <Link to="/account/settings" className="block transition-colors duration-150"
                style={{ padding: "5px 12px 5px 40px", fontSize: 12, color: "#8b909e", borderRadius: 8 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#e8eaf0"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#8b909e"; e.currentTarget.style.background = "transparent"; }}
              >Profile Settings</Link>
              <button className="w-full text-left transition-colors duration-150"
                style={{ padding: "5px 12px 5px 40px", fontSize: 12, color: "#8b909e", borderRadius: 8 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#e8eaf0"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#8b909e"; e.currentTarget.style.background = "transparent"; }}
              >Billing</button>
            </div>
          </div>
        )}

        {/* Logout */}
        {collapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="w-full flex items-center justify-center rounded-lg transition-all duration-150"
                  style={{ padding: "7px 0", margin: "1px 0", color: "#ef4444" }} onClick={handleSignOut}>
                  <LogOut style={{ width: 16, height: 16 }} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#1a1e28] text-[#e8eaf0] border-[rgba(255,255,255,0.1)]">Logout</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <button className="w-full flex items-center gap-2.5 rounded-lg transition-all duration-150"
            style={{ padding: "7px 12px", margin: "1px 0", fontSize: 13, fontWeight: 500, color: "#ef4444" }} onClick={handleSignOut}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <LogOut style={{ width: 16, height: 16 }} />
            <span>Logout</span>
          </button>
        )}
      </div>

      {/* User Profile at BOTTOM */}
      <div style={{ position: "sticky", bottom: 0, background: "#0d0f12", borderTop: "1px solid rgba(255,255,255,0.06)", padding: collapsed ? "12px 8px" : "12px 16px", flexShrink: 0 }}>
        <div className="flex items-center" style={{ gap: collapsed ? 0 : 10, justifyContent: collapsed ? "center" : "flex-start" }}>
          <Avatar className="h-8 w-8 shrink-0" style={{ border: "1px solid rgba(232,160,32,0.3)" }}>
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} className="object-cover" />}
            <AvatarFallback className="text-xs font-medium" style={{ background: "linear-gradient(135deg, #e8a020, #c47e10)", color: "white" }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate" style={{ fontSize: 12, fontWeight: 600, color: "#e8eaf0", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile?.full_name || "User"}
              </p>
              <p className="truncate" style={{ fontSize: 10, color: "#8b909e", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.email}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
