import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
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
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {renderContent()}
          </main>
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
