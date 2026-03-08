import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { ProposalCard } from "@/components/coach/ProposalCard";
import { AddFighterDialog } from "@/components/coach/AddFighterDialog";
import { AddFightResultDialog } from "@/components/coach/AddFightResultDialog";
import { FighterRosterPanel } from "@/components/coach/FighterRosterPanel";

export default function CoachDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddFighter, setShowAddFighter] = useState(false);
  const [fightResultFighter, setFightResultFighter] = useState<{ id: string; name: string } | null>(null);

  // Get coach's gyms
  const { data: myGyms = [] } = useQuery({
    queryKey: ["coach-gyms", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("gyms")
        .select("id, name")
        .eq("coach_id", user!.id)
        .order("name");
      return data || [];
    },
    enabled: !!user,
  });

  const myGym = myGyms.length > 0 ? myGyms[0] : null;

  // Get fighters created by this coach
  const { data: myFighters = [] } = useQuery({
    queryKey: ["coach-fighters", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fighter_profiles")
        .select("*")
        .eq("created_by_coach_id", user!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get fighter-gym links for coach's gyms
  const { data: fighterGymLinks = [] } = useQuery({
    queryKey: ["coach-fighter-gym-links", myGyms.map((g) => g.id)],
    queryFn: async () => {
      const gymIds = myGyms.map((g) => g.id);
      const { data } = await supabase
        .from("fighter_gym_links")
        .select("fighter_id, gym_id")
        .in("gym_id", gymIds);
      return data || [];
    },
    enabled: myGyms.length > 0,
  });

  // Get fighters linked via gyms
  const { data: gymFighters = [] } = useQuery({
    queryKey: ["coach-gym-fighters", fighterGymLinks.map((l) => l.fighter_id)],
    queryFn: async () => {
      if (fighterGymLinks.length === 0) return [];
      const fighterIds = [...new Set(fighterGymLinks.map((l) => l.fighter_id))];
      const { data: fighters, error } = await supabase
        .from("fighter_profiles")
        .select("*")
        .in("id", fighterIds);
      if (error) throw error;
      return fighters || [];
    },
    enabled: fighterGymLinks.length > 0,
  });

  // Combine unique fighters
  const allFighterMap = new Map<string, typeof myFighters[0]>();
  [...myFighters, ...gymFighters].forEach((f) => allFighterMap.set(f.id, f));
  const allFighters = Array.from(allFighterMap.values());
  const coachFighterIds = allFighters.map((f) => f.id);

  // Get proposals involving coach's fighters
  const { data: proposals = [] } = useQuery({
    queryKey: ["coach-proposals", coachFighterIds],
    queryFn: async () => {
      if (coachFighterIds.length === 0) return [];
      const { data: proposalsA } = await supabase
        .from("match_proposals")
        .select("*, fighter_a:fighter_profiles!match_proposals_fighter_a_id_fkey(*), fighter_b:fighter_profiles!match_proposals_fighter_b_id_fkey(*), fight_slot:fight_slots!match_proposals_fight_slot_id_fkey(*, events(*))")
        .in("fighter_a_id", coachFighterIds)
        .in("status", ["pending_coach_a", "pending_coach_b", "pending_fighter_a", "pending_fighter_b"]);
      
      const { data: proposalsB } = await supabase
        .from("match_proposals")
        .select("*, fighter_a:fighter_profiles!match_proposals_fighter_a_id_fkey(*), fighter_b:fighter_profiles!match_proposals_fighter_b_id_fkey(*), fight_slot:fight_slots!match_proposals_fight_slot_id_fkey(*, events(*))")
        .in("fighter_b_id", coachFighterIds)
        .in("status", ["pending_coach_a", "pending_coach_b", "pending_fighter_a", "pending_fighter_b"]);

      const map = new Map<string, any>();
      [...(proposalsA || []), ...(proposalsB || [])].forEach((p) => map.set(p.id, p));
      return Array.from(map.values());
    },
    enabled: coachFighterIds.length > 0,
  });

  const incomingProposals = proposals.filter((p) =>
    ["pending_coach_a", "pending_coach_b"].includes(p.status)
  );
  const awaitingFighters = proposals.filter((p) =>
    ["pending_fighter_a", "pending_fighter_b"].includes(p.status)
  );

  const stats = [
    { label: "Fighter Roster", value: String(allFighters.length), sub: "Fighters under your care" },
    { label: "Incoming Proposals", value: String(incomingProposals.length), sub: "Awaiting your review" },
    { label: "Awaiting Fighters", value: String(awaitingFighters.length), sub: "Pending fighter confirmation" },
  ];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["coach-proposals"] });
    queryClient.invalidateQueries({ queryKey: ["coach-fighters"] });
    queryClient.invalidateQueries({ queryKey: ["coach-gym-fighters"] });
    queryClient.invalidateQueries({ queryKey: ["coach-fighter-gym-links"] });
    queryClient.invalidateQueries({ queryKey: ["coach-gyms"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container">
            <h1 className="font-heading text-4xl md:text-5xl text-foreground mb-2">
              COACH <span className="text-primary">DASHBOARD</span>
            </h1>
            <p className="text-muted-foreground mb-8">
              Manage your fighters, review match proposals, and approve bouts.
            </p>

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

            {/* Fighter Roster with search & gym filter */}
            <FighterRosterPanel
              fighters={allFighters}
              gyms={myGyms}
              fighterGymLinks={fighterGymLinks}
              onAddFighter={() => setShowAddFighter(true)}
              onAddFightResult={(fighter) => setFightResultFighter(fighter)}
            />

            {/* Incoming Proposals */}
            <h2 className="font-heading text-2xl text-foreground mb-4">
              INCOMING <span className="text-primary">PROPOSALS</span>
            </h2>
            {incomingProposals.length === 0 ? (
              <p className="text-muted-foreground mb-8">No proposals requiring your review.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {incomingProposals.map((p) => (
                  <ProposalCard
                    key={p.id}
                    proposal={p}
                    userId={user!.id}
                    userRole="coach"
                    coachFighterIds={coachFighterIds}
                    onActionComplete={handleRefresh}
                  />
                ))}
              </div>
            )}

            {/* Add Fighter Dialog */}
            {user && (
              <AddFighterDialog
                open={showAddFighter}
                onOpenChange={setShowAddFighter}
                coachId={user.id}
                gymId={myGym?.id}
                onSuccess={handleRefresh}
              />
            )}

            {/* Add Fight Result Dialog */}
            {user && fightResultFighter && (
              <AddFightResultDialog
                open={!!fightResultFighter}
                onOpenChange={(open) => { if (!open) setFightResultFighter(null); }}
                fighter={fightResultFighter}
                coachId={user.id}
                onSuccess={handleRefresh}
              />
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
