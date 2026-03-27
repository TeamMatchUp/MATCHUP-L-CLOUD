import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { formatEnum } from "@/lib/format";
import { ChevronDown } from "lucide-react";
import { useCollapsibleSections } from "@/hooks/use-collapsible-sections";
import { format, subMonths } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";

/* ── Shared sub-components ── */

function SectionHeader({ title, collapsed, onToggle }: { title: string; collapsed?: boolean; onToggle?: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-3.5 mt-6 mb-3.5 w-full text-left group cursor-pointer">
      <span className="font-heading text-sm font-bold tracking-[2.5px] uppercase text-muted-foreground whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-border" />
      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${collapsed ? "-rotate-180" : ""}`} />
    </button>
  );
}

function StatCard({ label, value, sub, alert, note }: {
  label: string; value: string | number; sub?: string; alert?: boolean; note?: string;
}) {
  return (
    <div className={`bg-card border rounded-lg p-4 relative overflow-hidden ${alert ? "border-destructive" : "border-border"}`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${alert ? "bg-destructive opacity-90" : "bg-primary opacity-50"}`} />
      <div className="font-heading text-[10px] font-bold tracking-[1.5px] uppercase text-muted-foreground mb-1.5">{label}</div>
      <div className={`font-heading text-[32px] font-extrabold leading-none ${alert ? "text-destructive" : "text-primary"}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
      {note && <div className="text-[10px] text-primary/60 mt-1 italic">{note}</div>}
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

const DONUT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--accent-foreground))",
  "hsl(var(--secondary))",
];

const PRESETS = [
  { key: "action_night", label: "Action Night" },
  { key: "championship", label: "Championship" },
  { key: "grassroots", label: "Grassroots Dev" },
  { key: "ko_special", label: "KO Special" },
  { key: "undefeated_clash", label: "Undefeated Clash" },
];

/* ── Main shared component ── */

interface OrganiserAnalyticsProps {
  userId: string;
  /** If true, renders as a subsection inside coach analytics (no outer title) */
  embedded?: boolean;
}

export function OrganiserAnalyticsShared({ userId, embedded = false }: OrganiserAnalyticsProps) {
  const now = new Date();
  const { toggle, isCollapsed } = useCollapsibleSections("organiser-analytics");

  // ── Data fetching ──

  const { data: orgEvents = [] } = useQuery({
    queryKey: ["org-analytics-events", userId],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*, fight_slots(*)").eq("organiser_id", userId).order("date", { ascending: false });
      return data ?? [];
    },
  });

  const eventIds = orgEvents.map((e) => e.id);

  const { data: orgFightSlots = [] } = useQuery({
    queryKey: ["org-analytics-efs", userId, eventIds.join(",")],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data } = await supabase.from("event_fight_slots").select("*").in("event_id", eventIds);
      return data ?? [];
    },
    enabled: eventIds.length > 0,
  });

  const { data: orgSuggestions = [] } = useQuery({
    queryKey: ["org-analytics-suggestions", userId, eventIds.join(",")],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data } = await supabase.from("match_suggestions").select("*").in("event_id", eventIds);
      return data ?? [];
    },
    enabled: eventIds.length > 0,
  });

  const { data: orgPreferences = [] } = useQuery({
    queryKey: ["org-analytics-prefs", userId],
    queryFn: async () => {
      const { data } = await supabase.from("organiser_preferences").select("*").eq("organiser_id", userId);
      return data ?? [];
    },
  });

  const { data: orgTickets = [] } = useQuery({
    queryKey: ["org-analytics-tickets", userId, eventIds.join(",")],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data } = await supabase.from("tickets").select("*").in("event_id", eventIds);
      return data ?? [];
    },
    enabled: eventIds.length > 0,
  });

  const { data: allPlatformFighters = [] } = useQuery({
    queryKey: ["org-analytics-all-fighters"],
    queryFn: async () => {
      const { data } = await supabase.from("fighter_profiles").select("id, weight_class, discipline, available");
      return data ?? [];
    },
  });

  const { data: allFights = [] } = useQuery({
    queryKey: ["org-analytics-all-fights"],
    queryFn: async () => {
      const { data } = await supabase.from("fights").select("fighter_a_id");
      return data ?? [];
    },
  });

  const { data: fighterInterests = [] } = useQuery({
    queryKey: ["org-analytics-interests", eventIds.join(",")],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data } = await supabase.from("fighter_event_interests").select("id").in("event_id", eventIds);
      return data ?? [];
    },
    enabled: eventIds.length > 0,
  });

  // ── Section 1: Event Overview ──
  const totalEvents = orgEvents.length;
  const upcomingEvents = orgEvents.filter((e) => new Date(e.date) >= now && e.status !== "cancelled").length;
  const totalSlots = orgFightSlots.length;
  const confirmedBouts = orgFightSlots.filter((s) => s.status === "confirmed").length;
  const pendingSlots = orgFightSlots.filter((s) => s.status === "proposed" || s.status === "pending").length;
  const emptySlots = totalSlots - confirmedBouts - pendingSlots;
  const fillRate = totalSlots > 0 ? Math.round((confirmedBouts / totalSlots) * 100) : 0;
  const fightersBooked = new Set([
    ...orgFightSlots.filter((s) => s.status === "confirmed" && s.fighter_a_id).map((s) => s.fighter_a_id),
    ...orgFightSlots.filter((s) => s.status === "confirmed" && s.fighter_b_id).map((s) => s.fighter_b_id),
  ]).size;

  // ── Section 2: Matchmaking Analytics ──
  const suggestionsGenerated = orgSuggestions.length;
  const suggestionsConfirmed = orgSuggestions.filter((s) => s.status === "confirmed").length;
  const suggestionsDeclined = orgSuggestions.filter((s) => s.status === "dismissed" || s.status === "declined").length;
  const suggestionsPending = orgSuggestions.filter((s) => s.status === "suggested" || s.status === "pending").length;
  const acceptanceRate = suggestionsGenerated > 0 ? Math.round((suggestionsConfirmed / suggestionsGenerated) * 100) : 0;
  const avgComposite = suggestionsGenerated > 0
    ? (orgSuggestions.reduce((sum, s) => sum + (Number(s.composite_score) || 0), 0) / suggestionsGenerated).toFixed(2)
    : "0.00";

  // match_suggestions has no updated_at column; avg time to confirm not yet trackable
  const avgTimeToConfirmHrs = 0;
  const avgTimeToConfirmLabel = avgTimeToConfirmHrs > 0
    ? avgTimeToConfirmHrs >= 24 ? `${Math.round(avgTimeToConfirmHrs / 24)}d` : `${avgTimeToConfirmHrs}h`
    : "—";

  // Suggestions vs confirmed per month (last 6 months)
  const suggestionsLineData = useMemo(() => {
    const months: { month: string; Suggestions: number; Confirmed: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const label = format(d, "MMM");
      const m = d.getMonth();
      const y = d.getFullYear();
      months.push({
        month: label,
        Suggestions: orgSuggestions.filter((s) => { const sd = new Date(s.created_at); return sd.getMonth() === m && sd.getFullYear() === y; }).length,
        Confirmed: orgSuggestions.filter((s) => { const sd = new Date(s.created_at); return sd.getMonth() === m && sd.getFullYear() === y && s.status === "confirmed"; }).length,
      });
    }
    return months;
  }, [orgSuggestions]);

  // Slot fill per event (stacked bar)
  const slotFillData = useMemo(() => {
    return orgEvents.filter((e) => new Date(e.date) >= now && e.status !== "cancelled").slice(0, 10).map((e) => {
      const slots = orgFightSlots.filter((s) => s.event_id === e.id);
      const conf = slots.filter((s) => s.status === "confirmed").length;
      const pend = slots.filter((s) => s.status === "proposed" || s.status === "pending").length;
      const empty = slots.length - conf - pend;
      return { name: (e.title || "Event").slice(0, 12), Confirmed: conf, Pending: pend, Empty: empty };
    });
  }, [orgEvents, orgFightSlots]);

  // Preset usage doughnut (from organiser_preferences)
  const presetUsageData = useMemo(() => {
    const counts: Record<string, number> = {};
    PRESETS.forEach((p) => { counts[p.key] = 0; });
    orgPreferences.forEach((pref) => {
      const key = pref.preset || "action_night";
      counts[key] = (counts[key] || 0) + 1;
    });
    // Also count from suggestions preset_used
    orgSuggestions.forEach((s) => {
      if (s.preset_used) {
        counts[s.preset_used] = (counts[s.preset_used] || 0) + 1;
      }
    });
    return PRESETS.map((p) => ({ name: p.label, value: counts[p.key] || 0 }));
  }, [orgPreferences, orgSuggestions]);

  // ── Section 3: Card Fill Management ──
  const activeEvents = orgEvents.filter((e) => new Date(e.date) >= now && e.status !== "cancelled");
  const eventsNeedingAttention = activeEvents.filter((e) => {
    const slots = orgFightSlots.filter((s) => s.event_id === e.id);
    const conf = slots.filter((s) => s.status === "confirmed").length;
    return slots.length > 0 && (conf / slots.length) < 0.5;
  }).length;

  // ── Section 4: Talent Pool ──
  const weightClassData = useMemo(() => {
    const counts: Record<string, { total: number; available: number }> = {};
    allPlatformFighters.forEach((f) => {
      const wc = f.weight_class || "unknown";
      if (!counts[wc]) counts[wc] = { total: 0, available: 0 };
      counts[wc].total++;
      if (f.available) counts[wc].available++;
    });
    return Object.entries(counts)
      .map(([key, val]) => ({ key, name: formatEnum(key), total: val.total, available: val.available }))
      .sort((a, b) => b.total - a.total);
  }, [allPlatformFighters]);

  const disciplineData = useMemo(() => {
    const counts: Record<string, number> = {};
    allPlatformFighters.forEach((f) => {
      const d = f.discipline || "Unknown";
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: formatEnum(name), value }));
  }, [allPlatformFighters]);

  const experienceTierData = useMemo(() => {
    const fightCounts: Record<string, number> = {};
    allFights.forEach((f) => {
      fightCounts[f.fighter_a_id] = (fightCounts[f.fighter_a_id] || 0) + 1;
    });
    const tiers = { "T0 (0)": 0, "T1 (1-3)": 0, "T2 (4-9)": 0, "T3 (10+)": 0 };
    allPlatformFighters.forEach((f) => {
      const c = fightCounts[f.id] || 0;
      if (c === 0) tiers["T0 (0)"]++;
      else if (c <= 3) tiers["T1 (1-3)"]++;
      else if (c <= 9) tiers["T2 (4-9)"]++;
      else tiers["T3 (10+)"]++;
    });
    return Object.entries(tiers).map(([name, value]) => ({ name, Fighters: value }));
  }, [allPlatformFighters, allFights]);

  const availabilityRate = allPlatformFighters.length > 0
    ? Math.round((allPlatformFighters.filter((f) => f.available).length / allPlatformFighters.length) * 100)
    : 0;

  // ── Section 5: Ticket & Commercial Metrics ──
  const totalTicketsAvailable = orgEvents.reduce((sum, e) => sum + (e.ticket_count || 0), 0);
  const soldOutEvents = orgEvents.filter((e) => e.sold_out).length;
  const eventsWithTicketInfo = orgEvents.filter((e) => e.ticket_count != null && e.ticket_count > 0).length;
  const avgTicketsPerEvent = eventsWithTicketInfo > 0 ? Math.round(totalTicketsAvailable / eventsWithTicketInfo) : 0;

  const ticketChartData = useMemo(() => {
    return orgEvents.filter((e) => e.ticket_count != null && e.ticket_count > 0).slice(0, 10).map((e) => ({
      name: (e.title || "Event").slice(0, 12),
      Tickets: e.ticket_count || 0,
    }));
  }, [orgEvents]);

  // ── Section 7: Algorithm Preset Performance ──
  const presetPerformanceData = useMemo(() => {
    return PRESETS.map((preset) => {
      const matching = orgSuggestions.filter((s) => s.preset_used === preset.key);
      const timesUsed = orgPreferences.filter((p) => p.preset === preset.key).length + matching.length;
      const avgScore = matching.length > 0
        ? (matching.reduce((sum, s) => sum + (Number(s.composite_score) || 0), 0) / matching.length).toFixed(1)
        : "0";
      const confirmed = matching.filter((s) => s.status === "confirmed").length;
      const accRate = matching.length > 0 ? Math.round((confirmed / matching.length) * 100) : 0;
      return { preset: preset.label, key: preset.key, timesUsed, avgScore, accRate };
    });
  }, [orgSuggestions, orgPreferences]);

  const maxTimesUsed = Math.max(...presetPerformanceData.map((p) => p.timesUsed), 0);

  // ── Proposal funnel ──
  const funnelSteps = [
    { label: "Suggestions Generated", count: suggestionsGenerated, pct: 100 },
    { label: "Confirmed", count: suggestionsConfirmed, pct: suggestionsGenerated > 0 ? Math.round((suggestionsConfirmed / suggestionsGenerated) * 100) : 0 },
    { label: "Declined / Dismissed", count: suggestionsDeclined, pct: suggestionsGenerated > 0 ? Math.round((suggestionsDeclined / suggestionsGenerated) * 100) : 0 },
    { label: "Pending", count: suggestionsPending, pct: suggestionsGenerated > 0 ? Math.round((suggestionsPending / suggestionsGenerated) * 100) : 0 },
  ];

  if (orgEvents.length === 0 && !embedded) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No events found. Create your first event to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {!embedded && (
        <h2 className="font-heading text-2xl text-foreground">
          Organiser <span className="text-primary">Analytics</span>
        </h2>
      )}

      <SectionHeader title="Event Overview" collapsed={isCollapsed("overview")} onToggle={() => toggle("overview")} />
      {!isCollapsed("overview") && <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
        <StatCard label="Total Events" value={totalEvents} sub="Lifetime events created" />
        <StatCard label="Upcoming Events" value={upcomingEvents} sub="Scheduled & published" />
        <StatCard label="Total Fight Slots" value={totalSlots} sub="Across all events" />
        <StatCard label="Slots Filled %" value={`${fillRate}%`} sub={`${confirmedBouts} of ${totalSlots} confirmed`} />
        <StatCard label="Pending Proposals" value={suggestionsPending} sub="Awaiting response" alert={suggestionsPending > 5} />
        <StatCard label="Fighters Booked" value={fightersBooked} sub="Unique fighters confirmed" />
      </div>

      {/* ── SECTION 2: Matchmaking Analytics ── */}
      <SectionHeader title="Matchmaking Analytics" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard label="Suggestions Generated" value={suggestionsGenerated} sub="Total match suggestions" />
        <StatCard label="Acceptance Rate" value={`${acceptanceRate}%`} sub={`${suggestionsConfirmed} of ${suggestionsGenerated} confirmed`} />
        <StatCard label="Avg Composite Score" value={avgComposite} sub="Across all suggestions" />
        <StatCard label="Avg Time to Confirm" value={avgTimeToConfirmLabel} sub="From suggestion to confirm" />
      </div>

      {/* Suggestions line + funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3 flex items-center justify-between">
            Suggestions vs Confirmed
            <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full">Last 6 Months</span>
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={suggestionsLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="Suggestions" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} />
              <Line type="monotone" dataKey="Confirmed" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--chart-1))" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Proposal Conversion Funnel */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3">Proposal Conversion Funnel</h3>
          <div className="flex flex-col gap-2">
            {funnelSteps.map((step, i) => {
              const colors = ["hsl(var(--chart-3))", "hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];
              return (
                <div key={step.label} className="flex items-center gap-3">
                  <span className="font-heading text-[11px] tracking-[1.2px] uppercase text-muted-foreground min-w-[140px]">{step.label}</span>
                  <div className="flex-1 bg-accent rounded h-7 overflow-hidden">
                    <div
                      className="h-full rounded flex items-center pl-2.5 font-heading text-xs font-bold text-background"
                      style={{ width: `${Math.max(step.pct, 5)}%`, backgroundColor: colors[i] }}
                    >
                      {step.count}
                    </div>
                  </div>
                  <span className="font-heading text-base font-extrabold min-w-[28px] text-right" style={{ color: colors[i] }}>{step.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stacked bar (slot fill per event) + Preset doughnut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <div className="bg-card border border-border rounded-lg p-4 overflow-hidden">
          <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3">Slot Fill per Event</h3>
          {slotFillData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={slotFillData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="Confirmed" stackId="a" fill="hsl(var(--chart-1))" />
                <Bar dataKey="Pending" stackId="a" fill="hsl(var(--primary))" />
                <Bar dataKey="Empty" stackId="a" fill="hsl(var(--muted))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No active events.</p>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-4 overflow-hidden">
          <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3">Preset Usage</h3>
          {presetUsageData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={presetUsageData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {presetUsageData.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  layout="horizontal"
                  wrapperStyle={{ fontSize: "11px", lineHeight: "1.6" }}
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No preset usage data yet.</p>
          )}
        </div>
      </div>

      {/* ── SECTION 3: Card Fill Management ── */}
      <SectionHeader title="Card Fill Management" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        {/* Fill rate bars + history */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3 flex items-center justify-between">
            Fill Rate Per Event
            {eventsNeedingAttention > 0 && (
              <span className="text-[10px] bg-destructive/10 border border-destructive/20 text-destructive px-2 py-0.5 rounded-full">
                {eventsNeedingAttention} Need{eventsNeedingAttention === 1 ? "s" : ""} Attention
              </span>
            )}
          </h3>
          {activeEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No active events.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {activeEvents.slice(0, 6).map((event) => {
                const slots = orgFightSlots.filter((s) => s.event_id === event.id);
                const conf = slots.filter((s) => s.status === "confirmed").length;
                const total = slots.length;
                const pct = total > 0 ? Math.round((conf / total) * 100) : 0;
                const daysAway = Math.max(0, Math.ceil((new Date(event.date).getTime() - now.getTime()) / 86400000));
                const tagClass = pct >= 80 ? "bg-green-500/10 border-green-500/30 text-green-500" : pct >= 50 ? "bg-primary/10 border-primary/30 text-primary" : "bg-destructive/10 border-destructive/30 text-destructive";
                const tagLabel = pct >= 80 ? "On Track" : pct >= 50 ? "Watch" : "Critical";
                const barColor = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-primary" : "bg-destructive";
                return (
                  <div key={event.id} className="flex items-center gap-2.5">
                    <div className="min-w-[120px]">
                      <div className="font-heading text-xs font-bold text-foreground">{(event.title || "").slice(0, 18)}</div>
                      <div className="text-[10px] text-muted-foreground">{event.date ? format(new Date(event.date), "d MMM") : "—"} · {daysAway}d away</div>
                    </div>
                    <div className="flex-1 bg-accent rounded h-[18px] overflow-hidden">
                      <div className={`h-full rounded flex items-center pl-2 font-heading text-[10px] font-bold text-background ${barColor}`} style={{ width: `${Math.max(pct, 3)}%` }}>
                        {pct > 15 ? `${pct}%` : ""}
                      </div>
                    </div>
                    <span className={`font-heading text-xs font-bold min-w-[36px] text-right ${pct >= 80 ? "text-green-500" : pct >= 50 ? "text-primary" : "text-destructive"}`}>{pct}%</span>
                    <span className={`font-heading text-[10px] font-bold px-2 py-0.5 rounded-full border min-w-[60px] text-center ${tagClass}`}>{tagLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Per-event fill detail table */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3">Per-Event Fill Detail</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-[10px] tracking-[1.8px] uppercase text-muted-foreground font-heading font-bold">Event</th>
                  <th className="text-left py-2 px-2 text-[10px] tracking-[1.8px] uppercase text-muted-foreground font-heading font-bold">Slots</th>
                  <th className="text-left py-2 px-2 text-[10px] tracking-[1.8px] uppercase text-muted-foreground font-heading font-bold">Filled</th>
                  <th className="text-left py-2 px-2 text-[10px] tracking-[1.8px] uppercase text-muted-foreground font-heading font-bold">Empty</th>
                  <th className="text-left py-2 px-2 text-[10px] tracking-[1.8px] uppercase text-muted-foreground font-heading font-bold">Fill %</th>
                </tr>
              </thead>
              <tbody>
                {activeEvents.slice(0, 8).map((event) => {
                  const slots = orgFightSlots.filter((s) => s.event_id === event.id);
                  const conf = slots.filter((s) => s.status === "confirmed").length;
                  const empty = slots.length - conf;
                  const pct = slots.length > 0 ? Math.round((conf / slots.length) * 100) : 0;
                  return (
                    <tr key={event.id} className="border-b border-border/50">
                      <td className="py-2 px-2">
                        <div className="font-heading text-sm font-bold text-foreground">{(event.title || "").slice(0, 20)}</div>
                        <div className="text-[10px] text-muted-foreground">{event.date ? format(new Date(event.date), "d MMM yyyy") : "—"} · {event.city || "TBA"}</div>
                      </td>
                      <td className="py-2 px-2 font-heading font-bold text-foreground">{slots.length}</td>
                      <td className="py-2 px-2 font-heading font-bold text-green-500">{conf}</td>
                      <td className="py-2 px-2 font-heading font-bold text-destructive">{empty}</td>
                      <td className="py-2 px-2">
                        <span className={`font-heading text-sm font-extrabold ${pct >= 80 ? "text-green-500" : pct >= 50 ? "text-primary" : "text-destructive"}`}>{pct}%</span>
                      </td>
                    </tr>
                  );
                })}
                {/* Overall row */}
                {activeEvents.length > 0 && (
                  <tr className="bg-accent/30">
                    <td className="py-2 px-2 font-heading font-bold text-muted-foreground">Overall</td>
                    <td className="py-2 px-2 font-heading font-bold text-muted-foreground">{totalSlots}</td>
                    <td className="py-2 px-2 font-heading font-bold text-green-500">{confirmedBouts}</td>
                    <td className="py-2 px-2 font-heading font-bold text-destructive">{totalSlots - confirmedBouts}</td>
                    <td className="py-2 px-2">
                      <span className={`font-heading text-sm font-extrabold ${fillRate >= 80 ? "text-green-500" : fillRate >= 50 ? "text-primary" : "text-destructive"}`}>{fillRate}%</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: Talent Pool & Availability ── */}
      <SectionHeader title="Talent Pool & Availability" />

      {/* Weight class grid */}
      <div className="bg-card border border-border rounded-lg p-4 mb-3">
        <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3 flex items-center justify-between flex-wrap gap-2">
          Available Fighters by Weight Class
          <span className="text-[10px] bg-green-500/10 border border-green-500/30 text-green-500 px-2 py-0.5 rounded-full">Platform-wide</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {weightClassData.slice(0, 8).map((wc) => {
            const depthLabel = wc.total >= 150 ? "Deep" : wc.total >= 75 ? "Moderate" : "Shallow";
            const depthClass = wc.total >= 150 ? "bg-green-500/10 border-green-500/30 text-green-500" : wc.total >= 75 ? "bg-primary/10 border-primary/30 text-primary" : "bg-destructive/10 border-destructive/30 text-destructive";
            const barPct = allPlatformFighters.length > 0 ? Math.round((wc.total / allPlatformFighters.length) * 100) : 0;
            const barColor = wc.total >= 150 ? "bg-green-500" : wc.total >= 75 ? "bg-primary" : "bg-destructive";
            return (
              <div key={wc.key} className="bg-accent rounded-md p-3.5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-heading text-[28px] font-extrabold text-primary leading-none">{wc.total}</div>
                    <div className="font-heading text-[10px] tracking-[1px] uppercase text-muted-foreground mt-1">{wc.name}</div>
                    <div className="text-[11px] text-green-500 mt-0.5 font-heading">{wc.available} accepting proposals</div>
                  </div>
                  <span className={`font-heading text-[10px] font-bold px-1.5 py-0.5 rounded border ${depthClass}`}>{depthLabel}</span>
                </div>
                <div className="bg-card rounded h-1 overflow-hidden">
                  <div className={`h-full rounded ${barColor}`} style={{ width: `${barPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Discipline + Experience + Availability */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3">Disciplines</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={disciplineData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                {disciplineData.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-4">
          <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3">Experience Tiers</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={experienceTierData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Fighters" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="font-heading text-[10px] font-bold tracking-[1.5px] uppercase text-muted-foreground mb-1.5">Availability Rate</div>
          <div className="font-heading text-[40px] font-extrabold text-primary leading-none">{availabilityRate}%</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {allPlatformFighters.filter((f) => f.available).length} of {allPlatformFighters.length} fighters
          </div>
        </div>
      </div>

      {/* ── SECTION 5: Ticket & Commercial Metrics ── */}
      <SectionHeader title="Ticket & Commercial Metrics" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard label="Total Tickets Available" value={totalTicketsAvailable} sub="Across all events" note={totalTicketsAvailable === 0 ? "Set ticket count on your event to populate this" : undefined} />
        <StatCard label="Sold Out Events" value={soldOutEvents} sub={`Of ${totalEvents} total`} note={soldOutEvents === 0 ? "Set ticket count on your event to populate this" : undefined} />
        <StatCard label="Avg Tickets Per Event" value={avgTicketsPerEvent} sub="Ticket-enabled events" note={avgTicketsPerEvent === 0 ? "Set ticket count on your event to populate this" : undefined} />
        <StatCard label="Events With Ticket Info" value={eventsWithTicketInfo} sub="Events with ticketing" note={eventsWithTicketInfo === 0 ? "Set ticket count on your event to populate this" : undefined} />
      </div>

      {ticketChartData.length > 0 ? (
        <div className="bg-card border border-border rounded-lg p-4 mb-3">
          <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3">Ticket Count per Event</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ticketChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Tickets" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg p-4 mb-3 text-center">
          <p className="text-sm text-muted-foreground py-4">No ticket data available. Set ticket counts on your events to see this chart.</p>
        </div>
      )}

      {/* ── SECTION 6: Listing Performance ── */}
      <SectionHeader title="Listing Performance" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        {["Event Listing Views", "Click Through to Tickets", "Search Impressions"].map((label) => (
          <div key={label} className="bg-card border border-border rounded-lg p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted-foreground opacity-30" />
            <div className="font-heading text-[10px] font-bold tracking-[1.5px] uppercase text-muted-foreground mb-1.5">{label}</div>
            <div className="font-heading text-[32px] font-extrabold leading-none text-muted-foreground">0</div>
            <div className="text-[11px] text-primary/60 mt-1">Live tracking coming soon</div>
          </div>
        ))}
      </div>

      {/* ── SECTION 7: Algorithm Preset Performance ── */}
      <SectionHeader title="Algorithm Preset Performance" />
      <div className="bg-card border border-border rounded-lg p-4 mb-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-[10px] tracking-[1.8px] uppercase text-muted-foreground font-heading font-bold">Preset</th>
                <th className="text-left py-2 px-2 text-[10px] tracking-[1.8px] uppercase text-muted-foreground font-heading font-bold">Times Used</th>
                <th className="text-left py-2 px-2 text-[10px] tracking-[1.8px] uppercase text-muted-foreground font-heading font-bold">Avg Score</th>
                <th className="text-left py-2 px-2 text-[10px] tracking-[1.8px] uppercase text-muted-foreground font-heading font-bold">Acceptance Rate</th>
              </tr>
            </thead>
            <tbody>
              {presetPerformanceData.map((row) => (
                <tr
                  key={row.key}
                  className={`border-b border-border/50 ${row.timesUsed === maxTimesUsed && maxTimesUsed > 0 ? "border-l-2 border-l-primary" : ""}`}
                >
                  <td className="py-2 px-2 font-heading font-bold text-foreground">{row.preset}</td>
                  <td className="py-2 px-2 text-foreground">{row.timesUsed}</td>
                  <td className="py-2 px-2 text-primary font-bold">{row.avgScore}</td>
                  <td className="py-2 px-2 text-foreground">{row.accRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
