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

// Old CoachAnalytics removed — now in CoachAnalytics.tsx
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
