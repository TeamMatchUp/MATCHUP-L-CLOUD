import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppLogo } from "@/components/AppLogo";
import { NotificationBell } from "@/components/NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { DashboardGyms } from "@/components/dashboard/DashboardGyms";
import { DashboardRoster } from "@/components/dashboard/DashboardRoster";
import { DashboardActions, useActionsCount } from "@/components/dashboard/DashboardActions";
import { DashboardEvents } from "@/components/dashboard/DashboardEvents";
import { NotificationHistory } from "@/components/NotificationHistory";
import { DashboardInterests } from "@/components/dashboard/DashboardInterests";
import { CreateFighterProfileForm } from "@/components/fighter/CreateFighterProfileForm";
import { GymInvitesPanel } from "@/components/fighter/GymInvitesPanel";
import { GymsNearYouWidget } from "@/components/fighter/GymsNearYouWidget";
import { AddFighterToGymDialog } from "@/components/gym/AddFighterToGymDialog";
import { AddFightResultDialog } from "@/components/coach/AddFightResultDialog";
import { EditFighterDialog } from "@/components/coach/EditFighterDialog";
import { DeleteFighterDialog } from "@/components/coach/DeleteFighterDialog";
import { ImportFightersDialog } from "@/components/coach/ImportFightersDialog";
import { GymRequestsPanel } from "@/components/coach/GymRequestsPanel";
import { EditableProfilePanel } from "@/components/fighter/EditableProfilePanel";
import { DashboardAnalytics } from "@/components/dashboard/DashboardAnalytics";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_LABELS: Partial<Record<AppRole, string>> = {
  organiser: "Organiser",
  gym_owner: "Coach",
  fighter: "Fighter",
  admin: "Admin",
  coach: "Coach",
};

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get("section") || "overview";
  const navigate = useNavigate();
  const { user, roles, activeRole, setActiveRole, signOut } = useAuth();

  const data = useDashboardData();
  const {
    effectiveRoles,
    isCoachOrOwner,
    isOrganiser,
    isFighter,
    myGyms,
    primaryGym,
    fighterProfile,
    allFighters,
    allFighterIds,
    fighterGymLinks,
    pendingProposals,
    confirmedProposals,
    events,
    calendarEvents,
    notifications,
    unreadNotifications,
    handleRefresh,
  } = data;

  const gymIds = myGyms.map((g: any) => g.id);
  const actionsCount = useActionsCount(
    user?.id ?? "",
    isCoachOrOwner,
    isFighter,
    isOrganiser,
    fighterProfile,
    gymIds,
  );

  // Dialog states
  const [showAddFighter, setShowAddFighter] = useState(false);
  const [addFighterGymId, setAddFighterGymId] = useState<string | undefined>();
  const [fightResultFighter, setFightResultFighter] = useState<{ id: string; name: string } | null>(null);
  const [editFighter, setEditFighter] = useState<any>(null);
  const [deleteFighter, setDeleteFighter] = useState<{ id: string; name: string } | null>(null);
  const [showImport, setShowImport] = useState(false);

  // Profile for top bar
  const { data: profile } = useQuery({
    queryKey: ["dash-topbar-profile", user?.id],
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
  const greeting = profile?.full_name ? `Welcome, ${profile.full_name}` : "Welcome";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleRoleSwitch = (role: AppRole) => {
    setActiveRole(role);
  };

  const navigateToSection = (section: string) => {
    setSearchParams({ section });
  };

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div className="space-y-6">
            {isCoachOrOwner && myGyms.length > 0 && (
              <GymRequestsPanel
                gymIds={myGyms.map((g: any) => g.id)}
                coachId={user!.id}
              />
            )}
            {isFighter && !fighterProfile && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
                <div>
                  <p className="font-heading text-sm text-foreground">
                    Create your <span className="text-primary">fighter profile</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Set up your profile to start receiving match proposals.
                  </p>
                </div>
                <Button size="sm" onClick={() => navigateToSection("create-profile")}>
                  Create Profile
                </Button>
              </div>
            )}
            {isFighter && fighterProfile && (
              <GymInvitesPanel fighterProfileId={fighterProfile.id} />
            )}
            <DashboardOverview
              calendarEvents={calendarEvents}
              effectiveRoles={effectiveRoles as string[]}
              onNavigateSection={navigateToSection}
            />
            {isFighter && fighterProfile && (
              <GymsNearYouWidget fighterProfileId={fighterProfile.id} />
            )}
          </div>
        );

      case "gyms":
        return (
          <DashboardGyms
            isCoachOrOwner={isCoachOrOwner}
            isFighter={isFighter}
            fighterProfileId={fighterProfile?.id}
            myGyms={myGyms}
            userId={user!.id}
            onAddFighter={(gymId) => {
              setAddFighterGymId(gymId);
              setShowAddFighter(true);
            }}
            onRefresh={handleRefresh}
          />
        );

      case "roster":
        return (
          <DashboardRoster
            allFighters={allFighters}
            myGyms={myGyms}
            fighterGymLinks={fighterGymLinks}
            primaryGymId={primaryGym?.id}
            onAddFighter={() => {
              if (!addFighterGymId && primaryGym) setAddFighterGymId(primaryGym.id);
              setShowAddFighter(true);
            }}
            onEditFighter={(f) => setEditFighter(f)}
            onDeleteFighter={(f) => setDeleteFighter(f)}
            onAddFightResult={(f) => setFightResultFighter(f)}
            onImportFighters={primaryGym ? () => setShowImport(true) : undefined}
          />
        );

      case "actions":
        return (
          <DashboardActions
            userId={user!.id}
            isCoachOrOwner={isCoachOrOwner}
            isFighter={isFighter}
            isOrganiser={isOrganiser}
            fighterProfile={fighterProfile}
            myGyms={myGyms}
            allFighterIds={allFighterIds}
            onRefresh={handleRefresh}
          />
        );

      case "events":
        return (
          <DashboardEvents
            isCoachOrOwner={isCoachOrOwner}
            isOrganiser={isOrganiser}
            isFighter={isFighter}
            events={events}
            fighterProfileId={fighterProfile?.id}
          />
        );

      case "notifications":
        return <NotificationHistory />;

      case "analytics":
        return (
          <DashboardAnalytics
            isCoachOrOwner={isCoachOrOwner}
            isOrganiser={isOrganiser}
            isFighter={isFighter}
            myGyms={myGyms}
            allFighters={allFighters}
            events={events}
            fighterProfile={fighterProfile}
            userId={user!.id}
          />
        );

      case "my-profile":
        return fighterProfile ? (
          <EditableProfilePanel
            fighterProfile={fighterProfile}
            userId={user!.id}
            onRefresh={handleRefresh}
          />
        ) : (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 text-center space-y-3">
            <p className="font-heading text-lg text-foreground">
              Complete your profile to appear in matchmaking
            </p>
            <p className="text-sm text-muted-foreground">
              Set up your fighter profile with weight class, discipline, and stats.
            </p>
            <Button onClick={() => navigateToSection("create-profile")}>
              Create Fighter Profile
            </Button>
          </div>
        );

      case "create-profile":
        return (
          <div className="space-y-6">
            <h2 className="font-heading text-2xl text-foreground">
              Create your <span className="text-primary">fighter profile</span>
            </h2>
            <CreateFighterProfileForm
              userId={user!.id}
              userEmail={user!.email ?? ""}
              onSuccess={() => {
                handleRefresh();
                navigateToSection("overview");
              }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar
          pendingCount={pendingProposals.length}
          unreadCount={unreadNotifications.length}
          actionsCount={actionsCount}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-14 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-4 shrink-0 sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground" />
              <Link to="/" className="hidden sm:block">
                <AppLogo className="h-7" />
              </Link>
              <nav className="hidden md:flex items-center gap-6 ml-4">
                <Link to="/" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wide">
                  Home
                </Link>
                <Link to="/explore" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wide">
                  Explore
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="h-7 w-7">
                      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Profile" />}
                      <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {activeRole && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium hidden sm:inline">
                        {ROLE_LABELS[activeRole] || activeRole}
                      </span>
                    )}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {roles.length > 1 && (
                    <>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        Switch Role
                      </DropdownMenuLabel>
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
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="mb-6">
              <h1 className="font-heading text-3xl md:text-4xl text-foreground">
                {activeSection === "overview" ? greeting : activeSection.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </h1>
            </div>

            {renderContent()}
          </main>
        </div>
      </div>

      {/* Dialogs */}
      {user && (addFighterGymId || primaryGym?.id) && (
        <AddFighterToGymDialog
          open={showAddFighter}
          onOpenChange={setShowAddFighter}
          coachId={user.id}
          gymId={addFighterGymId || primaryGym!.id}
          onSuccess={handleRefresh}
        />
      )}

      {user && fightResultFighter && (
        <AddFightResultDialog
          open={!!fightResultFighter}
          onOpenChange={(open) => { if (!open) setFightResultFighter(null); }}
          fighter={fightResultFighter}
          coachId={user.id}
          onSuccess={handleRefresh}
        />
      )}

      {editFighter && (
        <EditFighterDialog
          open={!!editFighter}
          onOpenChange={(open) => { if (!open) setEditFighter(null); }}
          fighter={editFighter}
          onSuccess={handleRefresh}
        />
      )}

      {user && primaryGym && (
        <ImportFightersDialog
          open={showImport}
          onOpenChange={setShowImport}
          coachId={user.id}
          gymId={primaryGym.id}
          gymName={primaryGym.name}
          onSuccess={handleRefresh}
        />
      )}

      {deleteFighter && (
        <DeleteFighterDialog
          open={!!deleteFighter}
          onOpenChange={(open) => { if (!open) setDeleteFighter(null); }}
          fighter={deleteFighter}
          gymId={primaryGym?.id}
          removeFromGymOnly={false}
          onSuccess={handleRefresh}
        />
      )}
    </SidebarProvider>
  );
}
