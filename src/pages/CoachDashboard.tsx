import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { ProposalCard } from "@/components/coach/ProposalCard";

function formatEnum(val: string) {
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CoachDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  // Get fighters linked via gyms
  const { data: gymFighters = [] } = useQuery({
    queryKey: ["coach-gym-fighters", user?.id],
    queryFn: async () => {
      const { data: gyms } = await supabase
        .from("gyms")
        .select("id")
        .eq("coach_id", user!.id);
      if (!gyms || gyms.length === 0) return [];
      const gymIds = gyms.map((g) => g.id);
      const { data: links } = await supabase
        .from("fighter_gym_links")
        .select("fighter_id")
        .in("gym_id", gymIds);
      if (!links || links.length === 0) return [];
      const fighterIds = links.map((l) => l.fighter_id);
      const { data: fighters, error } = await supabase
        .from("fighter_profiles")
        .select("*")
        .in("id", fighterIds);
      if (error) throw error;
      return fighters || [];
    },
    enabled: !!user,
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
      // Get proposals where fighter_a or fighter_b is one of the coach's fighters
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

      // Deduplicate
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

            {/* Fighter Roster */}
            <h2 className="font-heading text-2xl text-foreground mb-4">
              FIGHTER <span className="text-primary">ROSTER</span>
            </h2>
            {allFighters.length === 0 ? (
              <p className="text-muted-foreground mb-8">No fighters linked to your account yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
                {allFighters.map((f) => (
                  <div key={f.id} className="rounded-lg border border-border bg-card p-4">
                    <p className="font-medium text-foreground">{f.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {f.record_wins}W-{f.record_losses}L-{f.record_draws}D · {formatEnum(f.weight_class)}
                    </p>
                    <div className="flex gap-1 mt-2">
                      {f.style && (
                        <Badge variant="outline" className="text-xs">{formatEnum(f.style)}</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{f.country}</Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${f.available ? "text-success border-success/30" : "text-destructive border-destructive/30"}`}
                      >
                        {f.available ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
