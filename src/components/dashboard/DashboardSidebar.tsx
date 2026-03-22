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
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  actionsCount?: number;
}

export function DashboardSidebar({ pendingCount, unreadCount, actionsCount = 0 }: DashboardSidebarProps) {
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
    { key: "my-profile", label: "My Profile", icon: User, roles: ["fighter"] },
    { key: "gyms", label: "My Gyms", icon: Building2, roles: ["gym_owner", "coach"] },
    { key: "roster", label: "Roster", icon: Users, roles: ["gym_owner", "coach"] },
    { key: "actions", label: "Actions", icon: Zap, badgeCount: actionsCount },
    { key: "events", label: "My Events", icon: Calendar, roles: ["gym_owner", "coach", "organiser"] },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
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
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                {profile?.full_name || "User"}
              </p>
              <p className="text-xs text-sidebar-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Avatar className="h-8 w-8">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>MENU</SidebarGroupLabel>
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
                      className={
                        isActive
                          ? "sidebar-pill-active"
                          : "sidebar-pill"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <span className="flex-1">{item.label}</span>
                      )}
                      {!collapsed && item.badgeCount && item.badgeCount > 0 ? (
                        <Badge
                          variant="outline"
                          className="ml-auto h-5 min-w-5 flex items-center justify-center text-[10px] bg-primary/10 text-primary border-primary/30"
                        >
                          {item.badgeCount}
                        </Badge>
                      ) : null}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>GENERAL</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings" className="sidebar-pill">
                  <Link to="/account/settings">
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>Settings</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleSignOut}
                  tooltip="Logout"
                  className="sidebar-pill text-destructive hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  {!collapsed && <span>Logout</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
