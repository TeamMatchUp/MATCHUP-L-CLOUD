import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { MatchProposalCard } from "@/components/fighter/MatchProposalCard";
import { CreateFighterProfileForm } from "@/components/fighter/CreateFighterProfileForm";
import { GymInvitesPanel } from "@/components/fighter/GymInvitesPanel";
import { MyGymsPanel } from "@/components/fighter/MyGymsPanel";
import { NotificationHistory } from "@/components/NotificationHistory";
import { InterestedEventsPanel } from "@/components/fighter/InterestedEventsPanel";
import { ProfileCompletionBar } from "@/components/fighter/ProfileCompletionBar";
import { GymsNearYouWidget } from "@/components/fighter/GymsNearYouWidget";
import { MyRequestsPanel } from "@/components/fighter/MyRequestsPanel";
import { EditableProfilePanel } from "@/components/fighter/EditableProfilePanel";
import { EventCalendar } from "@/components/dashboard/EventCalendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Inbox, Bell, Star, User, Send, Calendar, Search, Plus } from "lucide-react";
import { formatEnum } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function FighterDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const { data: fighterProfile } = useQuery({
    queryKey: ["fighter-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fighter_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: gymLinks = [] } = useQuery({
    queryKey: ["fighter-gym-links", fighterProfile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_gym_links")
        .select("id, status, gym:gyms(id, name)")
        .eq("fighter_id", fighterProfile!.id);
      return data ?? [];
    },
    enabled: !!fighterProfile,
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ["fighter-proposals", fighterProfile?.id],
    queryFn: async () => {
      if (!fighterProfile) return [];
      const { data: pA } = await supabase
        .from("match_proposals")
        .select("*, fighter_a:fighter_profiles!match_proposals_fighter_a_id_fkey(*), fighter_b:fighter_profiles!match_proposals_fighter_b_id_fkey(*), fight_slot:fight_slots!match_proposals_fight_slot_id_fkey(*, events(*))")
        .eq("fighter_a_id", fighterProfile.id)
        .neq("status", "declined")
        .neq("status", "withdrawn");
      const { data: pB } = await supabase
        .from("match_proposals")
        .select("*, fighter_a:fighter_profiles!match_proposals_fighter_a_id_fkey(*), fighter_b:fighter_profiles!match_proposals_fighter_b_id_fkey(*), fight_slot:fight_slots!match_proposals_fight_slot_id_fkey(*, events(*))")
        .eq("fighter_b_id", fighterProfile.id)
        .neq("status", "declined")
        .neq("status", "withdrawn");
      const map = new Map<string, any>();
      [...(pA || []), ...(pB || [])].forEach((p) => map.set(p.id, p));
      return Array.from(map.values());
    },
    enabled: !!fighterProfile,
  });

  // Calendar events
  const { data: calendarEvents = [] } = useQuery({
    queryKey: ["fighter-calendar-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, date, location, city, country, status")
        .eq("status", "published")
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .limit(20);
      return data ?? [];
    },
  });

  const pendingProposals = proposals.filter((p) => p.status === "pending");
  const confirmedFights = proposals.filter((p) => p.status === "confirmed");
  const awaitingOthers = proposals.filter(() => false);

  const stats = [
    { label: "Pending Your Decision", value: String(pendingProposals.length), sub: "Match proposals for you" },
    { label: "Upcoming Fights", value: String(confirmedFights.length), sub: "Confirmed matchups" },
    { label: "In Progress", value: String(awaitingOthers.length), sub: "Awaiting other approvals" },
  ];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["fighter-proposals"] });
    queryClient.invalidateQueries({ queryKey: ["fighter-profile"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container">
            <h1 className="font-heading text-4xl md:text-5xl text-foreground mb-2">
              FIGHTER <span className="text-primary">DASHBOARD</span>
            </h1>
            <p className="text-muted-foreground mb-8">
              Your fight proposals, upcoming bouts, and profile.
            </p>

            {!fighterProfile ? (
              <CreateFighterProfileForm
                userId={user!.id}
                userEmail={user!.email ?? ""}
                onSuccess={handleRefresh}
              />
            ) : (
              <>
                <ProfileCompletionBar fighterId={fighterProfile.id} fighterProfile={fighterProfile} />
                <GymInvitesPanel fighterProfileId={fighterProfile.id} />

                {/* Profile Summary */}
                <div className="rounded-lg border border-border bg-card p-5 mb-8">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-heading text-2xl text-foreground">{fighterProfile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {fighterProfile.record_wins}W-{fighterProfile.record_losses}L-{fighterProfile.record_draws}D ·{" "}
                        {formatEnum(fighterProfile.weight_class)} · {fighterProfile.country}
                        {fighterProfile.style && ` · ${formatEnum(fighterProfile.style)}`}
                        {gymLinks.filter((gl: any) => gl.status === "approved").map((gl: any) => (
                          <span key={gl.id}>{` · ${gl.gym?.name ?? "Gym"}`}</span>
                        ))}
                        {gymLinks.filter((gl: any) => gl.status === "pending").map((gl: any) => (
                          <span key={gl.id}>
                            {` · `}<span className="text-xs text-amber-500">Pending — {gl.gym?.name ?? "Gym"}</span>
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                  {stats.map((card) => (
                    <div key={card.label} className="rounded-lg border border-border bg-card p-5">
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className="font-heading text-3xl text-foreground mt-1">{card.value}</p>
                      <p className="text-xs text-muted-foreground mt-2">{card.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Calendar + Gyms Near You side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
                  <div className="lg:col-span-2">
                    <EventCalendar events={calendarEvents} highlightedDates={fighterHighlightedDates} />
                  </div>
                  <div>
                    <GymsNearYouWidget fighterProfileId={fighterProfile.id} />
                  </div>
                </div>

                {/* Quick Actions — below calendar, full width */}
                <div className="rounded-lg border border-border bg-card p-4 mb-10">
                  <h3 className="font-heading text-lg text-foreground mb-3">
                    QUICK <span className="text-primary">ACTIONS</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button variant="outline" className="justify-start gap-2 h-10" asChild>
                      <Link to="/explore?tab=events"><Search className="h-4 w-4 text-primary" /> Browse Events</Link>
                    </Button>
                    <Button variant="outline" className="justify-start gap-2 h-10" asChild>
                      <Link to="/explore?tab=gyms"><Building2 className="h-4 w-4 text-primary" /> Find Gyms</Link>
                    </Button>
                    <Button variant="outline" className="justify-start gap-2 h-10" asChild>
                      <Link to="/explore?tab=fighters"><User className="h-4 w-4 text-primary" /> Explore Fighters</Link>
                    </Button>
                    <Button variant="outline" className="justify-start gap-2 h-10" asChild>
                      <Link to={`/fighters/${fighterProfile.id}`}><Star className="h-4 w-4 text-primary" /> View Public Profile</Link>
                    </Button>
                  </div>
                </div>

                {/* View Selector */}
                <Tabs defaultValue={searchParams.get("tab") || "profile"} className="space-y-6">
                  <TabsList className="bg-card border border-border">
                    <TabsTrigger value="profile">
                      <User className="h-4 w-4 mr-1" /> My Profile
                      {(() => {
                        const mandatoryFields = ["date_of_birth", "walk_around_weight_kg", "height", "reach", "stance", "discipline", "weight_class"] as const;
                        const hasIncomplete = mandatoryFields.some((f) => !(fighterProfile as any)[f]);
                        return hasIncomplete ? <span className="h-2 w-2 rounded-full bg-primary ml-1.5 animate-pulse" /> : null;
                      })()}
                    </TabsTrigger>
                    <TabsTrigger value="gyms">
                      <Building2 className="h-4 w-4 mr-1" /> Gyms
                    </TabsTrigger>
                    <TabsTrigger value="proposals">
                      <Inbox className="h-4 w-4 mr-1" /> Proposals
                    </TabsTrigger>
                    <TabsTrigger value="requests">
                      <Send className="h-4 w-4 mr-1" /> My Requests
                    </TabsTrigger>
                    <TabsTrigger value="interests">
                      <Star className="h-4 w-4 mr-1" /> Interested Events
                    </TabsTrigger>
                    <TabsTrigger value="notifications">
                      <Bell className="h-4 w-4 mr-1" /> Notifications
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="profile">
                    <EditableProfilePanel
                      fighterProfile={fighterProfile}
                      userId={user!.id}
                      onRefresh={handleRefresh}
                    />
                  </TabsContent>

                  <TabsContent value="gyms">
                    <MyGymsPanel fighterProfileId={fighterProfile.id} />
                  </TabsContent>

                  <TabsContent value="proposals">
                    {pendingProposals.length > 0 && (
                      <>
                        <h2 className="font-heading text-2xl text-foreground mb-4">
                          AWAITING YOUR <span className="text-primary">DECISION</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                          {pendingProposals.map((p) => (
                            <MatchProposalCard
                              key={p.id}
                              proposal={p}
                              fighterProfileId={fighterProfile.id}
                              userId={user!.id}
                              onActionComplete={handleRefresh}
                            />
                          ))}
                        </div>
                      </>
                    )}
                    {confirmedFights.length > 0 && (
                      <>
                        <h2 className="font-heading text-2xl text-foreground mb-4">
                          UPCOMING <span className="text-primary">FIGHTS</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {confirmedFights.map((p) => (
                            <MatchProposalCard
                              key={p.id}
                              proposal={p}
                              fighterProfileId={fighterProfile.id}
                              userId={user!.id}
                              onActionComplete={handleRefresh}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="requests">
                    <h2 className="font-heading text-2xl text-foreground mb-4">
                      MY <span className="text-primary">REQUESTS</span>
                    </h2>
                    <MyRequestsPanel />
                  </TabsContent>

                  <TabsContent value="interests">
                    <InterestedEventsPanel fighterProfileId={fighterProfile.id} />
                  </TabsContent>

                  <TabsContent value="notifications">
                    <NotificationHistory />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
