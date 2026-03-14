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
import { ChevronDown, Settings, LogOut, Building2, Users, Inbox, Check, Calendar, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { DashboardGyms } from "@/components/dashboard/DashboardGyms";
import { DashboardRoster } from "@/components/dashboard/DashboardRoster";
import { DashboardProposals } from "@/components/dashboard/DashboardProposals";
import { DashboardEvents } from "@/components/dashboard/DashboardEvents";
import { NotificationHistory } from "@/components/NotificationHistory";
import { CreateFighterProfileForm } from "@/components/fighter/CreateFighterProfileForm";
import { GymInvitesPanel } from "@/components/fighter/GymInvitesPanel";
import { AddFighterToGymDialog } from "@/components/gym/AddFighterToGymDialog";
import { AddFightResultDialog } from "@/components/coach/AddFightResultDialog";
import { EditFighterDialog } from "@/components/coach/EditFighterDialog";
import { DeleteFighterDialog } from "@/components/coach/DeleteFighterDialog";
import { ImportFightersDialog } from "@/components/coach/ImportFightersDialog";
import { BottomTabBar } from "@/components/BottomTabBar";
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

  // Compute metrics
  const openSlots = events
    .flatMap((e: any) => e.fight_slots || [])
    .filter((s: any) => s.status === "open").length;

  const metrics = [
    { label: "Gyms", value: myGyms.length, sub: "Under your management", icon: Building2, section: "gyms" },
    { label: "Fighters", value: allFighters.length, sub: "In your roster", icon: Users, section: "roster" },
    { label: "Pending", value: pendingProposals.length, sub: "Awaiting review", icon: Inbox, section: "proposals" },
    { label: "Confirmed", value: confirmedProposals.length, sub: "Locked in", icon: Check, section: "proposals" },
    { label: "Events", value: events.length, sub: "Created by you", icon: Calendar, section: "events" },
    { label: "Unread", value: unreadNotifications.length, sub: "Notifications", icon: Bell, section: "notifications" },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <div className="space-y-6">
            {/* Fighter profile creation prompt */}
            {isFighter && !fighterProfile && (
              <div className="mu-card mu-card-featured p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--mu-t1)]">
                    Create your <span className="text-[var(--mu-gold)]">fighter profile</span>
                  </p>
                  <p className="text-xs text-[var(--mu-t3)] mt-0.5">
                    Set up your profile to start receiving match proposals.
                  </p>
                </div>
                <button className="mu-btn-primary" onClick={() => navigateToSection("create-profile")}>
                  Create profile
                </button>
              </div>
            )}
            {/* Fighter gym invites banner */}
            {isFighter && fighterProfile && (
              <GymInvitesPanel fighterProfileId={fighterProfile.id} />
            )}
            <DashboardOverview
              metrics={metrics}
              calendarEvents={calendarEvents}
              notifications={notifications}
              effectiveRoles={effectiveRoles as string[]}
              onNavigateSection={navigateToSection}
            />
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

      case "proposals":
        return (
          <DashboardProposals
            isCoachOrOwner={isCoachOrOwner}
            isFighter={isFighter}
            pendingProposals={pendingProposals}
            confirmedProposals={confirmedProposals}
            userId={user!.id}
            fighterIds={allFighterIds}
            fighterProfileId={fighterProfile?.id}
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
        return (
          <DashboardEvents
            isCoachOrOwner={false}
            isOrganiser={false}
            isFighter={true}
            events={[]}
            fighterProfileId={fighterProfile?.id}
          />
        );

      case "notifications":
        return <NotificationHistory />;

      case "create-profile":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-medium text-[var(--mu-t1)]">
              Create your <span className="text-[var(--mu-gold)]">fighter profile</span>
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

  const sectionTitle = () => {
    if (activeSection === "overview") return null;
    const titles: Record<string, React.ReactNode> = {
      gyms: <>My <span className="text-[var(--mu-gold)]">gyms</span></>,
      roster: <><span className="text-[var(--mu-gold)]">Roster</span></>,
      proposals: <><span className="text-[var(--mu-gold)]">Proposals</span></>,
      events: <><span className="text-[var(--mu-gold)]">Events</span></>,
      interests: <>Interested <span className="text-[var(--mu-gold)]">events</span></>,
      notifications: <><span className="text-[var(--mu-gold)]">Notifications</span></>,
    };
    return titles[activeSection] || activeSection;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[var(--mu-bg)]">
        <DashboardSidebar
          pendingCount={pendingProposals.length}
          unreadCount={unreadNotifications.length}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-14 flex items-center justify-between border-b border-[var(--mu-border)] bg-[var(--mu-bg)] px-4 shrink-0 sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-[var(--mu-t2)]" />
              <Link to="/" className="hidden sm:block">
                <AppLogo className="h-7" />
              </Link>
              <nav className="hidden md:flex items-center gap-6 ml-4">
                <Link
                  to="/"
                  className="text-xs font-medium text-[var(--mu-t2)] hover:text-[var(--mu-t1)] transition-colors duration-150"
                >
                  Home
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 text-xs font-medium text-[var(--mu-t2)] hover:text-[var(--mu-t1)] transition-colors duration-150">
                      Explore
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem asChild>
                      <Link to="/events" className="text-xs">Events</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/fighters" className="text-xs">Fighters</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/gyms" className="text-xs">Gyms</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="h-7 w-7">
                      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Profile" />}
                      <AvatarFallback className="text-[10px] bg-[var(--mu-raised)] text-[var(--mu-t2)]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {activeRole && (
                      <span className="text-xs bg-[var(--mu-gold-t)] text-[var(--mu-gold)] px-2 py-0.5 rounded-full font-medium hidden sm:inline">
                        {ROLE_LABELS[activeRole] || activeRole}
                      </span>
                    )}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {roles.length > 1 && (
                    <>
                      <DropdownMenuLabel className="text-xs text-[var(--mu-t3)]">
                        Switch role
                      </DropdownMenuLabel>
                      {roles.map((role) => (
                        <DropdownMenuItem
                          key={role}
                          onClick={() => handleRoleSwitch(role)}
                          className={role === activeRole ? "bg-[var(--mu-gold-t)] text-[var(--mu-gold)]" : ""}
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
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            <div className="mb-6">
              {activeSection === "overview" ? (
                <>
                  <p className="mu-eyebrow">Welcome back</p>
                  <h1 className="text-2xl font-medium text-[var(--mu-t1)]">
                    <span className="text-[var(--mu-gold)]">Match</span>up
                  </h1>
                  <p className="text-mu-md text-[var(--mu-t3)] mt-1">
                    Operations dashboard
                  </p>
                </>
              ) : (
                <h1 className="text-2xl font-medium text-[var(--mu-t1)]">
                  {sectionTitle()}
                </h1>
              )}
            </div>

            {renderContent()}
          </main>
        </div>
      </div>

      {/* Bottom Tab Bar — mobile only */}
      <BottomTabBar />

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
