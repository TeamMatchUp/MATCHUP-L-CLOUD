import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, TrendingUp, Target, Swords, Building2 } from "lucide-react";
import { useState, useMemo } from "react";
import { formatEnum } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { FighterAnalyticsV2 } from "./FighterAnalytics";
import { CoachAnalyticsV2 } from "./CoachAnalytics";

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

const GOLD = "hsl(44 87% 58%)";
const RED = "hsl(0 72% 51%)";
const GREY = "hsl(220 9% 46%)";
const BLUE = "hsl(217 91% 60%)";

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: any; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="font-heading text-3xl text-primary tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-lg">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

function CoachAnalytics({ myGyms, allFighters, events, userId }: { myGyms: any[]; allFighters: any[]; events: any[]; userId: string }) {
  const gymIds = myGyms.map((g) => g.id);

  const { data: gymLeads = [] } = useQuery({
    queryKey: ["analytics-gym-leads", gymIds],
    queryFn: async () => {
      if (gymIds.length === 0) return [];
      const { data } = await supabase.from("gym_leads").select("id, type, created_at").in("gym_id", gymIds);
      return data ?? [];
    },
    enabled: gymIds.length > 0,
  });

  const totalWins = allFighters.reduce((sum, f) => sum + (f.record_wins || 0), 0);
  const totalLosses = allFighters.reduce((sum, f) => sum + (f.record_losses || 0), 0);

  const now = new Date();
  const trialThisMonth = gymLeads.filter((l) => l.type === "trial_request" && new Date(l.created_at).getMonth() === now.getMonth() && new Date(l.created_at).getFullYear() === now.getFullYear()).length;
  const upcomingEvents = events.filter((e) => new Date(e.date) >= now).length;

  // Bar chart: per-fighter win/loss
  const rosterChart = allFighters.slice(0, 10).map((f) => ({
    name: f.name?.split(" ")[0] ?? "?",
    Wins: f.record_wins || 0,
    Losses: f.record_losses || 0,
  }));

  // Line chart: leads over last 30 days
  const leadsChart = useMemo(() => {
    const days: { date: string; leads: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split("T")[0];
      days.push({ date: key.slice(5), leads: 0 });
    }
    gymLeads.forEach((l) => {
      const key = l.created_at.split("T")[0].slice(5);
      const entry = days.find((d) => d.date === key);
      if (entry) entry.leads++;
    });
    return days;
  }, [gymLeads]);

  // Leaderboard
  const leaderboard = [...allFighters]
    .map((f) => {
      const total = (f.record_wins || 0) + (f.record_losses || 0);
      return { ...f, winPct: total > 0 ? Math.round(((f.record_wins || 0) / total) * 100) : 0, totalFights: total };
    })
    .filter((f) => f.totalFights > 0)
    .sort((a, b) => b.winPct - a.winPct);

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl text-foreground">Coach <span className="text-primary">analytics</span></h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total fighters" value={allFighters.length} icon={Users} />
        <StatCard label="Total leads" value={gymLeads.length} icon={Target} />
        <StatCard label="Active gyms" value={myGyms.length} icon={Building2} />
        <StatCard label="Upcoming events" value={upcomingEvents} icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Roster Win/Loss */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-heading text-sm text-foreground mb-4">Roster win/loss record</h3>
          {rosterChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={rosterChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 9% 20%)" />
                <XAxis dataKey="name" tick={{ fill: GREY, fontSize: 11 }} />
                <YAxis tick={{ fill: GREY, fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Wins" fill={GOLD} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Losses" fill={RED} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No fighter data yet.</p>
          )}
        </div>

        {/* Leads over time */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-heading text-sm text-foreground mb-4">Gym leads (last 30 days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={leadsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 9% 20%)" />
              <XAxis dataKey="date" tick={{ fill: GREY, fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: GREY, fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="leads" stroke={GOLD} strokeWidth={2} dot={false} name="Leads" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-heading text-sm text-foreground mb-4">Fighter leaderboard</h3>
        {leaderboard.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">#</th>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Fighter</th>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Record</th>
                  <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Win%</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((f, i) => (
                  <tr
                    key={f.id}
                    className={`border-b border-border/50 ${i === 0 ? "bg-primary/5" : "hover:bg-muted/30"}`}
                  >
                    <td className={`py-2 px-3 ${i === 0 ? "text-primary font-bold" : "text-muted-foreground"}`}>{i + 1}</td>
                    <td className={`py-2 px-3 font-medium ${i === 0 ? "text-primary" : "text-foreground"}`}>{f.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">{f.record_wins}W-{f.record_losses}L-{f.record_draws || 0}D</td>
                    <td className={`py-2 px-3 text-right font-medium ${i === 0 ? "text-primary" : "text-foreground"}`}>{f.winPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No fight records yet.</p>
        )}
      </div>
    </div>
  );
}

// FighterAnalytics is now in FighterAnalytics.tsx

function OrganiserAnalytics({ events, userId }: { events: any[]; userId: string }) {
  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.date) >= now).length;
  const totalSlots = events.flatMap((e: any) => e.fight_slots || []).length;
  const filledSlots = events.flatMap((e: any) => e.fight_slots || []).filter((s: any) => s.status !== "open").length;
  const fillPct = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  const { data: proposals = [] } = useQuery({
    queryKey: ["analytics-organiser-proposals", userId],
    queryFn: async () => {
      const slotIds = events.flatMap((e: any) => (e.fight_slots || []).map((s: any) => s.id));
      if (slotIds.length === 0) return [];
      const { data } = await supabase.from("match_proposals").select("id, status, created_at").in("fight_slot_id", slotIds);
      return data ?? [];
    },
    enabled: events.length > 0,
  });

  const pendingProposals = proposals.filter((p) => ["pending", "pending_coach_a", "pending_coach_b"].includes(p.status));

  // Fill rate per event
  const fillChart = events.slice(0, 10).map((e: any) => {
    const slots = e.fight_slots || [];
    const filled = slots.filter((s: any) => s.status !== "open").length;
    return { name: e.title?.slice(0, 15) ?? "Event", "Fill %": slots.length > 0 ? Math.round((filled / slots.length) * 100) : 0 };
  });

  // Proposals over time (last 30 days)
  const proposalsChart = useMemo(() => {
    const days: { date: string; proposals: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      days.push({ date: d.toISOString().split("T")[0].slice(5), proposals: 0 });
    }
    proposals.forEach((p) => {
      const key = p.created_at.split("T")[0].slice(5);
      const entry = days.find((d) => d.date === key);
      if (entry) entry.proposals++;
    });
    return days;
  }, [proposals]);

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl text-foreground">Organiser <span className="text-primary">analytics</span></h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total events" value={events.length} icon={Calendar} />
        <StatCard label="Fight slots" value={totalSlots} icon={Swords} />
        <StatCard label="Slots filled" value={`${fillPct}%`} icon={Target} />
        <StatCard label="Pending proposals" value={pendingProposals.length} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-heading text-sm text-foreground mb-4">Fill rate per event</h3>
          {fillChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={fillChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 9% 20%)" />
                <XAxis dataKey="name" tick={{ fill: GREY, fontSize: 10 }} />
                <YAxis tick={{ fill: GREY, fontSize: 11 }} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Fill %" fill={GOLD} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No events yet.</p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-heading text-sm text-foreground mb-4">Proposals received (last 30 days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={proposalsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 9% 20%)" />
              <XAxis dataKey="date" tick={{ fill: GREY, fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: GREY, fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="proposals" stroke={GOLD} strokeWidth={2} dot={false} name="Proposals" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function DashboardAnalytics(props: DashboardAnalyticsProps) {
  const { isCoachOrOwner, isOrganiser, isFighter, myGyms, allFighters, events, fighterProfile, userId } = props;

  return (
    <div className="space-y-8">
      {isCoachOrOwner && <CoachAnalytics myGyms={myGyms} allFighters={allFighters} events={events} userId={userId} />}
      {isFighter && fighterProfile && <FighterAnalyticsV2 fighterProfile={fighterProfile} />}
      {isOrganiser && <OrganiserAnalytics events={events} userId={userId} />}
      {!isCoachOrOwner && !isFighter && !isOrganiser && (
        <p className="text-muted-foreground text-center py-12">No analytics available for your role yet.</p>
      )}
    </div>
  );
}
