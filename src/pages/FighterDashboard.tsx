import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { MatchProposalCard } from "@/components/fighter/MatchProposalCard";
import { CreateFighterProfileForm } from "@/components/fighter/CreateFighterProfileForm";
import { GymInvitesPanel } from "@/components/fighter/GymInvitesPanel";

function formatEnum(val: string) {
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FighterDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const pendingProposals = proposals.filter((p) =>
    ["pending_fighter_a", "pending_fighter_b"].includes(p.status)
  );
  const confirmedFights = proposals.filter((p) => p.status === "confirmed");
  const awaitingOthers = proposals.filter((p) =>
    ["pending_coach_a", "pending_coach_b"].includes(p.status)
  );

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
              FIGHTER <span className="text-primary">PORTAL</span>
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
                {/* Profile Summary */}
                <div className="rounded-lg border border-border bg-card p-5 mb-8">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-heading text-2xl text-foreground">{fighterProfile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {fighterProfile.record_wins}W-{fighterProfile.record_losses}L-{fighterProfile.record_draws}D ·{" "}
                        {formatEnum(fighterProfile.weight_class)} · {fighterProfile.country}
                        {fighterProfile.style && ` · ${formatEnum(fighterProfile.style)}`}
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
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
