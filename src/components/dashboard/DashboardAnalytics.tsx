import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Users, Calendar, TrendingUp, Target, Award, Swords, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { formatEnum } from "@/lib/format";

interface DashboardAnalyticsProps {
  isCoachOrOwner: boolean;
  isOrganiser: boolean;
  isFighter: boolean;
  myGyms: any[];
  allFighters: any[];
  events: any[];
  fighterProfile: any | null;
  userId: string;
}

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: any; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="font-heading text-2xl text-foreground tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function CoachAnalytics({ myGyms, allFighters, events, userId }: { myGyms: any[]; allFighters: any[]; events: any[]; userId: string }) {
  const gymIds = myGyms.map((g) => g.id);

  const { data: gymLeads = [] } = useQuery({
    queryKey: ["analytics-gym-leads", gymIds],
    queryFn: async () => {
      if (gymIds.length === 0) return [];
      const { data } = await supabase
        .from("gym_leads")
        .select("id, type, created_at")
        .in("gym_id", gymIds);
      return data ?? [];
    },
    enabled: gymIds.length > 0,
  });

  const { data: profileViews = [] } = useQuery({
    queryKey: ["analytics-profile-views", gymIds],
    queryFn: async () => {
      if (gymIds.length === 0) return [];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("gym_profile_views")
        .select("id")
        .in("gym_id", gymIds)
        .gte("viewed_at", weekAgo);
      return data ?? [];
    },
    enabled: gymIds.length > 0,
  });

  const totalWins = allFighters.reduce((sum, f) => sum + (f.record_wins || 0), 0);
  const totalLosses = allFighters.reduce((sum, f) => sum + (f.record_losses || 0), 0);
  const topPerformer = allFighters.length > 0
    ? allFighters.reduce((best, f) => {
        const total = (f.record_wins || 0) + (f.record_losses || 0);
        const winPct = total > 0 ? (f.record_wins || 0) / total : 0;
        const bestTotal = (best.record_wins || 0) + (best.record_losses || 0);
        const bestPct = bestTotal > 0 ? (best.record_wins || 0) / bestTotal : 0;
        return winPct > bestPct ? f : best;
      }, allFighters[0])
    : null;

  const now = new Date();
  const trialThisMonth = gymLeads.filter((l) => {
    if (l.type !== "trial_request") return false;
    const d = new Date(l.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const upcomingEvents = events.filter((e) => new Date(e.date) >= now).length;
  const proposals = events.flatMap((e: any) => e.fight_slots || []).length;

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl text-foreground">
        COACH <span className="text-primary">ANALYTICS</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Fighters card */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h3 className="font-heading text-sm text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> FIGHTERS
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-2xl font-heading text-foreground">{allFighters.length}</p>
              <p className="text-[11px] text-muted-foreground">Roster Size</p>
            </div>
            <div>
              <p className="text-2xl font-heading text-foreground">{totalWins}W-{totalLosses}L</p>
              <p className="text-[11px] text-muted-foreground">Combined Record</p>
            </div>
          </div>
          {topPerformer && (
            <div className="border-t border-border pt-2">
              <p className="text-[11px] text-muted-foreground">Top Performer</p>
              <p className="text-sm font-medium text-foreground">{topPerformer.name}</p>
              <p className="text-xs text-primary">
                {Math.round(((topPerformer.record_wins || 0) / Math.max(1, (topPerformer.record_wins || 0) + (topPerformer.record_losses || 0))) * 100)}% Win Rate
              </p>
            </div>
          )}
        </div>

        {/* Gyms card */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h3 className="font-heading text-sm text-foreground flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> GYMS
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-2xl font-heading text-foreground">{profileViews.length}</p>
              <p className="text-[11px] text-muted-foreground">Views This Week</p>
            </div>
            <div>
              <p className="text-2xl font-heading text-foreground">{gymLeads.length}</p>
              <p className="text-[11px] text-muted-foreground">Total Leads</p>
            </div>
          </div>
          <div className="border-t border-border pt-2">
            <div className="flex justify-between">
              <div>
                <p className="text-xl font-heading text-foreground">{trialThisMonth}</p>
                <p className="text-[11px] text-muted-foreground">Trials This Month</p>
              </div>
              <div>
                <p className="text-xl font-heading text-foreground">{myGyms.length}</p>
                <p className="text-[11px] text-muted-foreground">Managed Gyms</p>
              </div>
            </div>
          </div>
        </div>

        {/* Events card */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h3 className="font-heading text-sm text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> EVENTS
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-2xl font-heading text-foreground">{events.length}</p>
              <p className="text-[11px] text-muted-foreground">Total Events</p>
            </div>
            <div>
              <p className="text-2xl font-heading text-foreground">{upcomingEvents}</p>
              <p className="text-[11px] text-muted-foreground">Upcoming</p>
            </div>
          </div>
          <div className="border-t border-border pt-2">
            <p className="text-xl font-heading text-foreground">{proposals}</p>
            <p className="text-[11px] text-muted-foreground">Total Fight Slots</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FighterAnalytics({ fighterProfile }: { fighterProfile: any }) {
  const [weightFilter, setWeightFilter] = useState<string>("all");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");

  const { data: fights = [] } = useQuery({
    queryKey: ["analytics-fighter-fights", fighterProfile.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fights")
        .select("*")
        .or(`fighter_a_id.eq.${fighterProfile.id},fighter_b_id.eq.${fighterProfile.id}`);
      return data ?? [];
    },
  });

  const { data: allFighters = [] } = useQuery({
    queryKey: ["analytics-all-fighters-ranking"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_profiles")
        .select("id, name, weight_class, discipline, record_wins, record_losses, record_draws")
        .eq("visibility", "public");
      return data ?? [];
    },
  });

  const totalFights = fights.length;
  const wins = fights.filter((f) => f.result === "win" || f.winner_id === fighterProfile.id).length;
  const losses = fights.filter((f) => f.result === "loss" || (f.winner_id && f.winner_id !== fighterProfile.id)).length;
  const draws = fights.filter((f) => f.result === "draw" || (!f.winner_id && f.result !== "win" && f.result !== "loss")).length;
  const totalFromProfile = (fighterProfile.record_wins || 0) + (fighterProfile.record_losses || 0) + (fighterProfile.record_draws || 0);
  const effectiveTotalFights = Math.max(totalFights, totalFromProfile);
  const effectiveWins = Math.max(wins, fighterProfile.record_wins || 0);
  const effectiveLosses = Math.max(losses, fighterProfile.record_losses || 0);
  const effectiveDraws = Math.max(draws, fighterProfile.record_draws || 0);
  const winPct = effectiveTotalFights > 0 ? Math.round((effectiveWins / effectiveTotalFights) * 100) : 0;

  const finishes = fights.filter((f) => {
    const m = (f.method || "").toLowerCase();
    return (f.result === "win" || f.winner_id === fighterProfile.id) && (m.includes("ko") || m.includes("tko") || m.includes("submission"));
  }).length;
  const finishRate = effectiveWins > 0 ? Math.round((finishes / effectiveWins) * 100) : 0;

  // Milestone badges
  const milestones = [];
  if (effectiveWins >= 1) milestones.push({ label: "First Win", icon: "🏆" });
  if (effectiveTotalFights >= 5) milestones.push({ label: "5-Fight Veteran", icon: "⭐" });
  if (effectiveTotalFights >= 10) milestones.push({ label: "10-Fight Veteran", icon: "🌟" });
  if (effectiveLosses === 0 && effectiveTotalFights >= 3) milestones.push({ label: "Undefeated", icon: "🔥" });
  if (finishRate > 70 && effectiveWins >= 3) milestones.push({ label: "Finisher", icon: "💥" });

  // Ranking
  const rankedFighters = useMemo(() => {
    let filtered = allFighters;
    if (weightFilter !== "all") filtered = filtered.filter((f) => f.weight_class === weightFilter);
    if (disciplineFilter !== "all") filtered = filtered.filter((f) => f.discipline === disciplineFilter);

    return filtered
      .map((f) => {
        const total = (f.record_wins || 0) + (f.record_losses || 0);
        return { ...f, winPct: total > 0 ? (f.record_wins || 0) / total * 100 : 0, totalFights: total };
      })
      .filter((f) => f.totalFights > 0)
      .sort((a, b) => b.winPct - a.winPct);
  }, [allFighters, weightFilter, disciplineFilter]);

  const myRank = rankedFighters.findIndex((f) => f.id === fighterProfile.id) + 1;

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl text-foreground">
        FIGHTER <span className="text-primary">ANALYTICS</span>
      </h2>

      {/* Career Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <StatCard label="Total Fights" value={effectiveTotalFights} icon={Swords} />
        <StatCard label="Wins" value={effectiveWins} icon={Trophy} />
        <StatCard label="Losses" value={effectiveLosses} icon={TrendingUp} />
        <StatCard label="Draws" value={effectiveDraws} icon={Target} />
        <StatCard label="Win %" value={`${winPct}%`} icon={Percent} />
        <StatCard label="Finish Rate" value={`${finishRate}%`} icon={Award} />
      </div>

      {/* Milestone Badges */}
      {milestones.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-heading text-sm text-foreground mb-3">MILESTONES</h3>
          <div className="flex flex-wrap gap-2">
            {milestones.map((m) => (
              <Badge key={m.label} variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1">
                <span>{m.icon}</span> {m.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Ranking Table */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-sm text-foreground">
            WEIGHT CLASS <span className="text-primary">RANKING</span>
            {myRank > 0 && <span className="ml-2 text-xs text-muted-foreground">(You: #{myRank})</span>}
          </h3>
          <div className="flex gap-2">
            <Select value={weightFilter} onValueChange={setWeightFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Weight" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Weights</SelectItem>
                <SelectItem value="flyweight">Flyweight</SelectItem>
                <SelectItem value="bantamweight">Bantamweight</SelectItem>
                <SelectItem value="featherweight">Featherweight</SelectItem>
                <SelectItem value="lightweight">Lightweight</SelectItem>
                <SelectItem value="welterweight">Welterweight</SelectItem>
                <SelectItem value="middleweight">Middleweight</SelectItem>
                <SelectItem value="heavyweight">Heavyweight</SelectItem>
              </SelectContent>
            </Select>
            <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Discipline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Boxing">Boxing</SelectItem>
                <SelectItem value="Muay Thai">Muay Thai</SelectItem>
                <SelectItem value="MMA">MMA</SelectItem>
                <SelectItem value="BJJ">BJJ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {rankedFighters.length > 0 ? (
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {rankedFighters.slice(0, 20).map((f, i) => (
              <div
                key={f.id}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm ${
                  f.id === fighterProfile.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-6 text-right">#{i + 1}</span>
                  <span className="font-medium text-foreground">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{formatEnum(f.weight_class)}</span>
                </div>
                <span className="text-xs text-primary font-medium">{f.winPct.toFixed(0)}% ({f.record_wins}W-{f.record_losses}L)</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No fighters found matching filters.</p>
        )}
      </div>
    </div>
  );
}

function OrganiserAnalytics({ events, userId }: { events: any[]; userId: string }) {
  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.date) >= now).length;
  const totalSlots = events.flatMap((e: any) => e.fight_slots || []).length;
  const filledSlots = events.flatMap((e: any) => e.fight_slots || []).filter((s: any) => s.status !== "open").length;

  const { data: proposals = [] } = useQuery({
    queryKey: ["analytics-organiser-proposals", userId],
    queryFn: async () => {
      const eventIds = events.map((e) => e.id);
      if (eventIds.length === 0) return [];
      const slotIds = events.flatMap((e: any) => (e.fight_slots || []).map((s: any) => s.id));
      if (slotIds.length === 0) return [];
      const { data } = await supabase
        .from("match_proposals")
        .select("id, status")
        .in("fight_slot_id", slotIds);
      return data ?? [];
    },
    enabled: events.length > 0,
  });

  const { data: nominations = [] } = useQuery({
    queryKey: ["analytics-organiser-nominations", events.map((e) => e.id)],
    queryFn: async () => {
      const eventIds = events.map((e) => e.id);
      if (eventIds.length === 0) return [];
      const { data } = await supabase
        .from("coach_event_nominations")
        .select("id, event_id")
        .in("event_id", eventIds);
      return data ?? [];
    },
    enabled: events.length > 0,
  });

  const pendingProposals = proposals.filter((p) => p.status === "pending" || p.status === "pending_coach_a" || p.status === "pending_coach_b");
  const confirmedProposals = proposals.filter((p) => p.status === "confirmed");

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl text-foreground">
        ORGANISER <span className="text-primary">ANALYTICS</span>
      </h2>

      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h3 className="font-heading text-sm text-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" /> EVENTS OVERVIEW
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-heading text-foreground">{events.length}</p>
            <p className="text-[11px] text-muted-foreground">Events Created</p>
          </div>
          <div>
            <p className="text-2xl font-heading text-foreground">{upcomingEvents}</p>
            <p className="text-[11px] text-muted-foreground">Upcoming</p>
          </div>
          <div>
            <p className="text-2xl font-heading text-foreground">{nominations.length}</p>
            <p className="text-[11px] text-muted-foreground">Fighters Put Forward</p>
          </div>
          <div>
            <p className="text-2xl font-heading text-foreground">{totalSlots}</p>
            <p className="text-[11px] text-muted-foreground">Total Fight Slots</p>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <h4 className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Proposals</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xl font-heading text-foreground">{proposals.length}</p>
              <p className="text-[11px] text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-xl font-heading text-warning">{pendingProposals.length}</p>
              <p className="text-[11px] text-muted-foreground">Pending</p>
            </div>
            <div>
              <p className="text-xl font-heading text-success">{confirmedProposals.length}</p>
              <p className="text-[11px] text-muted-foreground">Confirmed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardAnalytics(props: DashboardAnalyticsProps) {
  const { isCoachOrOwner, isOrganiser, isFighter, myGyms, allFighters, events, fighterProfile, userId } = props;

  return (
    <div className="space-y-8">
      {isCoachOrOwner && (
        <CoachAnalytics myGyms={myGyms} allFighters={allFighters} events={events} userId={userId} />
      )}
      {isFighter && fighterProfile && (
        <FighterAnalytics fighterProfile={fighterProfile} />
      )}
      {isOrganiser && (
        <OrganiserAnalytics events={events} userId={userId} />
      )}
      {!isCoachOrOwner && !isFighter && !isOrganiser && (
        <p className="text-muted-foreground text-center py-12">No analytics available for your role yet.</p>
      )}
    </div>
  );
}
