import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Building2,
  Users,
  Inbox,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Star,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface NavItem {
  key: string;
  label: string;
  icon: any;
  roles?: string[];
  badgeCount?: number;
}

interface DashboardSidebarProps {
  pendingCount: number;
  unreadCount: number;
}

export function DashboardSidebar({ pendingCount, unreadCount }: DashboardSidebarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get("section") || "overview";
  const { user, effectiveRoles, signOut } = useAuth();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

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

  const initials = (profile?.full_name || user?.email || "U")
    .slice(0, 2)
    .toUpperCase();

  const navItems: NavItem[] = [
    { key: "overview", label: "Dashboard", icon: LayoutDashboard },
    { key: "gyms", label: "My gyms", icon: Building2, roles: ["gym_owner", "coach", "fighter"] },
    { key: "roster", label: "Roster", icon: Users, roles: ["gym_owner", "coach"] },
    { key: "proposals", label: "Proposals", icon: Inbox, badgeCount: pendingCount },
    { key: "events", label: "Events", icon: Calendar, roles: ["gym_owner", "coach", "organiser"] },
    { key: "interests", label: "Interested events", icon: Star, roles: ["fighter"] },
    { key: "notifications", label: "Notifications", icon: Bell, badgeCount: unreadCount },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((r) => effectiveRoles.includes(r as AppRole));
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleNav = (key: string) => {
    setSearchParams({ section: key });
  };

  return (
    <Sidebar collapsible="icon" className="bg-[var(--sidebar-background)]">
      <SidebarHeader className="p-4 border-b border-[var(--mu-border)]">
        {!collapsed ? (
          <div className="flex items-center gap-3 pb-1">
            <Avatar className="h-9 w-9 shrink-0 border border-[var(--mu-border2)]">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-[var(--mu-raised)] text-[var(--mu-t2)] text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[var(--mu-t1)] truncate">
                {profile?.full_name || "User"}
              </p>
              <p className="text-[10px] text-[var(--mu-t3)] truncate">
                {user?.email}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Avatar className="h-8 w-8 border border-[var(--mu-border2)]">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-[var(--mu-raised)] text-[var(--mu-t2)] text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="mu-section-label px-2.5">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
                const isActive = activeSection === item.key;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      onClick={() => handleNav(item.key)}
                      isActive={isActive}
                      tooltip={item.label}
                      className={`flex items-center gap-2.5 px-2.5 py-[9px] rounded-[9px] mb-0.5 transition-colors duration-150 ${
                        isActive
                          ? "bg-[var(--mu-gold-t)] text-[var(--mu-gold)] font-medium hover:bg-[var(--mu-gold-t)] hover:text-[var(--mu-gold)]"
                          : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 ${
                        isActive ? "bg-[var(--mu-gold-t)]" : "bg-white/[0.04]"
                      }`}>
                        <item.icon className="h-4 w-4" />
                      </span>
                      {!collapsed && (
                        <span className="flex-1">{item.label}</span>
                      )}
                      {!collapsed && item.badgeCount && item.badgeCount > 0 ? (
                        <span className="ml-auto text-[9px] font-medium bg-[var(--mu-gold-t)] text-[var(--mu-gold)] px-1.5 py-0.5 rounded-[5px]">
                          {item.badgeCount}
                        </span>
                      ) : null}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="mu-section-label px-2.5">General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Settings"
                  className="flex items-center gap-2.5 px-2.5 py-[9px] rounded-[9px] mb-0.5 hover:bg-white/[0.04] transition-colors duration-150"
                >
                  <Link to="/account/settings">
                    <span className="w-7 h-7 rounded-[7px] bg-white/[0.04] flex items-center justify-center shrink-0">
                      <Settings className="h-4 w-4" />
                    </span>
                    {!collapsed && <span>Settings</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleSignOut}
                  tooltip="Logout"
                  className="flex items-center gap-2.5 px-2.5 py-[9px] rounded-[9px] mt-auto hover:bg-white/[0.04] transition-colors duration-150"
                >
                  <span className="w-7 h-7 rounded-[7px] bg-red-500/[0.08] flex items-center justify-center shrink-0">
                    <LogOut className="h-4 w-4 text-red-400/70" />
                  </span>
                  {!collapsed && <span className="text-red-400/70">Logout</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
