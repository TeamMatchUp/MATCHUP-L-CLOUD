import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { FighterInterestsPage } from "@/components/fighter/FighterInterestsPage";
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
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
    highlightedDates,
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

  const SECTION_TITLES: Record<string, string> = {
    overview: "Dashboard",
    "my-profile": "My Profile",
    gyms: "My Gyms",
    roster: "Fighter Roster",
    interests: "Fighter Interests",
    actions: "Action Centre",
    events: "My Events",
    analytics: "Analytics Centre",
    notifications: "Notifications",
    "create-profile": "Create Profile",
  };

  const sectionTitle = SECTION_TITLES[activeSection] || "Dashboard";

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
              highlightedDates={highlightedDates}
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

      case "interests":
        if (isFighter && fighterProfile) {
          return (
            <FighterInterestsPage
              fighterProfileId={fighterProfile.id}
              fighterPostcode={fighterProfile.postcode}
            />
          );
        }
        return (
          <DashboardInterests
            userId={user!.id}
            rosterFighterIds={allFighterIds}
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

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const sidebarW = isMobile ? 0 : (sidebarCollapsed ? 56 : 220);

  return (
    <div style={{ background: "hsl(var(--background))", width: "100vw", minHeight: "100vh", margin: 0 }}>
      {/* Mobile sidebar overlay */}
      {isMobile && mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Sidebar — fixed */}
      <div
        className={isMobile ? "fixed top-0 left-0 bottom-0 z-50" : ""}
        style={isMobile ? { transform: mobileSidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.2s ease" } : {}}
      >
        <DashboardSidebar
          pendingCount={pendingProposals.length}
          unreadCount={unreadNotifications.length}
          actionsCount={actionsCount}
          collapsed={isMobile ? false : sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </div>

      {/* Main content — margin-left for fixed sidebar */}
      <div
        className="flex flex-col min-w-0"
        style={{
          marginLeft: sidebarW,
          transition: "margin-left 0.2s ease",
          minHeight: "100vh",
          background: "hsl(var(--bg-page, var(--background)))",
        }}
      >
        {/* Mobile hamburger */}
        {isMobile && (
          <div className="sticky top-0 z-30 flex items-center h-12 px-3" style={{ background: "hsl(var(--background))" }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebarOpen(true)}
              className="h-8 w-8"
              style={{ color: "#8b909e" }}
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto" style={{ paddingTop: activeSection === "overview" ? 0 : 24, minHeight: "100vh" }}>
          {sectionTitle !== "Dashboard" && activeSection !== "overview" && (
            <h1 className="font-heading text-2xl md:text-3xl mb-6 px-4 md:px-6" style={{ color: "#e8eaf0" }}>
              {sectionTitle}
            </h1>
          )}
          <div className={activeSection === "overview" ? "" : "px-4 md:px-6 pb-6"}>
            {renderContent()}
          </div>
        </main>
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
    </div>
  );
}
