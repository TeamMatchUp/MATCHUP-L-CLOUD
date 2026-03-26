import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { formatEnum } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { X, ChevronRight, ChevronLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, differenceInDays, subMonths } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { OrganiserAnalyticsShared } from "./OrganiserAnalytics";
import { useNavigate } from "react-router-dom";

/* ── Reusable sub-components ── */

function SectionHeader({ title, large }: { title: string; large?: boolean }) {
  return (
    <div className="flex items-center gap-3.5 mt-6 mb-3.5">
      <span className={`font-heading font-bold tracking-[2.5px] uppercase text-muted-foreground whitespace-nowrap ${large ? "text-sm" : "text-xs"}`}>{title}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function Toggle({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <span className="inline-flex bg-accent border border-border rounded-[5px] overflow-hidden">
      {options.map((label) => {
        const k = label.toLowerCase();
        const active = value === k;
        return (
          <button
            key={k}
            onClick={(e) => { e.stopPropagation(); onChange(k); }}
            className={`font-heading text-[10px] font-bold tracking-[1px] uppercase border-none px-2.5 py-[3px] cursor-pointer transition-all duration-150 ${active ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground"}`}
          >
            {label}
          </button>
        );
      })}
    </span>
  );
}

function StatCard({ label, value, sub, toggle, onClick, alert, clickHint }: {
  label: string; value: string | number; sub?: string; toggle?: React.ReactNode;
  onClick?: () => void; alert?: boolean; clickHint?: string;
}) {
  return (
    <div
      className={`bg-card border rounded-lg p-4 relative overflow-hidden ${alert ? "border-destructive" : "border-border"} ${onClick ? "cursor-pointer hover:border-primary/50 transition-colors" : ""}`}
      onClick={onClick}
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${alert ? "bg-destructive opacity-90" : "bg-primary opacity-50"}`} />
      <div className="font-heading text-[10px] font-bold tracking-[1.5px] uppercase text-muted-foreground flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
        {label}{toggle}
      </div>
      <div className={`font-heading text-[32px] font-extrabold leading-none ${alert ? "text-destructive" : "text-primary"}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
      {clickHint && <div className="text-[10px] text-primary/60 mt-1 font-heading tracking-[0.5px]">{clickHint}</div>}
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

/* ── Main component ── */

export function CoachAnalyticsV2({ userId }: { userId: string }) {
  const { effectiveRoles } = useAuth();
  const navigate = useNavigate();
  const [activeMonths, setActiveMonths] = useState<"6m" | "12m">("6m");
  const [showActiveModal, setShowActiveModal] = useState(false);
  const [reachPeriod, setReachPeriod] = useState<"30d" | "all">("30d");

  const now = new Date();
  const hasOrganiserRole = effectiveRoles.includes("organiser");
  const queryClient = useQueryClient();

  // ── Fetch coach's gyms ──
  const { data: myGyms = [] } = useQuery({
    queryKey: ["coach-analytics-gyms", userId],
    queryFn: async () => {
      const { data } = await supabase.from("gyms").select("id, name").eq("coach_id", userId);
      return data ?? [];
    },
  });
  const gymIds = myGyms.map((g) => g.id);

  // ── Fetch roster fighters (created by coach OR linked via gyms) ──
  const { data: createdFighters = [] } = useQuery({
    queryKey: ["coach-analytics-created-fighters", userId],
    queryFn: async () => {
      const { data } = await supabase.from("fighter_profiles").select("*").eq("created_by_coach_id", userId);
      return data ?? [];
    },
  });

  const { data: gymLinks = [] } = useQuery({
    queryKey: ["coach-analytics-gym-links", gymIds],
    queryFn: async () => {
      if (gymIds.length === 0) return [];
      const { data } = await supabase.from("fighter_gym_links").select("fighter_id, gym_id").in("gym_id", gymIds).eq("status", "approved");
      return data ?? [];
    },
    enabled: gymIds.length > 0,
  });

  const linkedFighterIds = [...new Set(gymLinks.map((l) => l.fighter_id))];

  const { data: linkedFighters = [] } = useQuery({
    queryKey: ["coach-analytics-linked-fighters", linkedFighterIds],
    queryFn: async () => {
      if (linkedFighterIds.length === 0) return [];
      const { data } = await supabase.from("fighter_profiles").select("*").in("id", linkedFighterIds);
      return data ?? [];
    },
    enabled: linkedFighterIds.length > 0,
  });

  // Combine unique roster
  const rosterMap = new Map<string, any>();
  [...createdFighters, ...linkedFighters].forEach((f) => rosterMap.set(f.id, f));
  const roster = Array.from(rosterMap.values());
  const rosterIds = roster.map((f) => f.id);

  // ── Fetch all fights for roster ──
  const { data: allFights = [] } = useQuery({
    queryKey: ["coach-analytics-fights", rosterIds],
    queryFn: async () => {
      if (rosterIds.length === 0) return [];
      const { data: a } = await supabase.from("fights").select("*").in("fighter_a_id", rosterIds);
      const { data: b } = await supabase.from("fights").select("*").in("fighter_b_id", rosterIds);
      const map = new Map<string, any>();
      [...(a || []), ...(b || [])].forEach((f) => map.set(f.id, f));
      return Array.from(map.values());
    },
    enabled: rosterIds.length > 0,
  });

  // ── Fetch match_suggestions for roster ──
  const { data: suggestions = [] } = useQuery({
    queryKey: ["coach-analytics-suggestions", rosterIds],
    queryFn: async () => {
      if (rosterIds.length === 0) return [];
      const { data: a } = await supabase.from("match_suggestions").select("*").in("fighter_a_id", rosterIds);
      const { data: b } = await supabase.from("match_suggestions").select("*").in("fighter_b_id", rosterIds);
      const map = new Map<string, any>();
      [...(a || []), ...(b || [])].forEach((s) => map.set(s.id, s));
      return Array.from(map.values());
    },
    enabled: rosterIds.length > 0,
  });

  // ── Fetch event_fight_slots for roster ──
  const { data: fightSlots = [] } = useQuery({
    queryKey: ["coach-analytics-fight-slots", rosterIds],
    queryFn: async () => {
      if (rosterIds.length === 0) return [];
      const { data: a } = await supabase.from("event_fight_slots").select("*, events(id, title, date, city, venue_name)").in("fighter_a_id", rosterIds);
      const { data: b } = await supabase.from("event_fight_slots").select("*, events(id, title, date, city, venue_name)").in("fighter_b_id", rosterIds);
      const map = new Map<string, any>();
      [...(a || []), ...(b || [])].forEach((s) => map.set(s.id, s));
      return Array.from(map.values());
    },
    enabled: rosterIds.length > 0,
  });

  // ── Fetch gym_leads ──
  const { data: gymLeads = [] } = useQuery({
    queryKey: ["coach-analytics-gym-leads", gymIds],
    queryFn: async () => {
      if (gymIds.length === 0) return [];
      const { data } = await supabase.from("gym_leads").select("*").in("gym_id", gymIds);
      return data ?? [];
    },
    enabled: gymIds.length > 0,
  });

  // ── Fetch gym_profile_views ──
  const { data: profileViews = [] } = useQuery({
    queryKey: ["coach-analytics-profile-views", gymIds],
    queryFn: async () => {
      if (gymIds.length === 0) return [];
      const { data } = await supabase.from("gym_profile_views").select("*").in("gym_id", gymIds);
      return data ?? [];
    },
    enabled: gymIds.length > 0,
  });

  // ── Fetch pending fighter_gym_links ──
  const { data: pendingGymLinks = [] } = useQuery({
    queryKey: ["coach-analytics-pending-links", gymIds],
    queryFn: async () => {
      if (gymIds.length === 0) return [];
      const { data } = await supabase.from("fighter_gym_links").select("id").in("gym_id", gymIds).eq("status", "pending");
      return data ?? [];
    },
    enabled: gymIds.length > 0,
  });

  // Organiser section visibility — data is handled by shared component
  const { data: orgEventsCheck = [] } = useQuery({
    queryKey: ["coach-org-events-check", userId],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("id").eq("organiser_id", userId).limit(1);
      return data ?? [];
    },
  });

  const showOrganiserSection = hasOrganiserRole || orgEventsCheck.length > 0;

  // ════════════════════════════════════════════
  // SECTION 1: Roster Overview computations
  // ════════════════════════════════════════════

  // Helper: get fighter's record from fights
  function getFighterRecord(fighterId: string) {
    let wins = 0, losses = 0, draws = 0;
    allFights.forEach((fight) => {
      const isA = fight.fighter_a_id === fighterId;
      const isB = fight.fighter_b_id === fighterId;
      if (!isA && !isB) return;
      if (fight.fighter_a_id === fight.fighter_b_id && !fight.opponent_name) return;
      const isSelfRef = fight.fighter_a_id === fight.fighter_b_id;
      if (fight.winner_id) {
        if (fight.winner_id === fighterId) wins++; else losses++;
      } else if (fight.result === "draw") {
        draws++;
      } else if (fight.result === "win") {
        if (isSelfRef || isA) wins++; else losses++;
      } else if (fight.result === "loss") {
        if (isSelfRef || isA) losses++; else wins++;
      }
    });
    return { wins, losses, draws };
  }

  // Fighter's last fight date
  function getLastFightDate(fighterId: string): Date | null {
    const dates = allFights
      .filter((f) => f.fighter_a_id === fighterId || f.fighter_b_id === fighterId)
      .map((f) => f.event_date ? new Date(f.event_date) : null)
      .filter(Boolean) as Date[];
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map((d) => d.getTime())));
  }

  const cutoffMonths = activeMonths === "6m" ? 6 : 12;
  const cutoffDate = subMonths(now, cutoffMonths);

  const activeFighters = roster.filter((f) => {
    const last = getLastFightDate(f.id);
    return last && last >= cutoffDate;
  });

  // Aggregate roster win rate
  const rosterTotals = useMemo(() => {
    let w = 0, l = 0, d = 0;
    roster.forEach((f) => {
      const rec = getFighterRecord(f.id);
      w += rec.wins; l += rec.losses; d += rec.draws;
    });
    const total = w + l + d;
    return { wins: w, losses: l, draws: d, total, winPct: total > 0 ? Math.round((w / total) * 100) : 0 };
  }, [roster, allFights]);

  const pendingSuggestions = suggestions.filter((s) => s.status === "suggested").length;

  // Upcoming events with roster fighters
  const upcomingSlots = fightSlots.filter((s) => {
    const ev = s.events;
    return ev && new Date(ev.date) >= now;
  });
  const upcomingEventIds = [...new Set(upcomingSlots.map((s) => s.events?.id).filter(Boolean))];

  // ════════════════════════════════════════════
  // SECTION 2: Matchmaking Activity
  // ════════════════════════════════════════════

  const confirmedSuggestions = suggestions.filter((s) => s.status === "confirmed").length;
  const totalSuggestions = suggestions.length;
  const acceptanceRate = totalSuggestions > 0 ? Math.round((confirmedSuggestions / totalSuggestions) * 100) : 0;

  function bookedInDays(days: number) {
    const cutoff = new Date(now.getTime() + days * 86400000);
    return upcomingSlots.filter((s) => {
      const ev = s.events;
      return ev && s.status === "confirmed" && new Date(ev.date) <= cutoff;
    }).length;
  }

  // ════════════════════════════════════════════
  // SECTION 3: Upcoming Events
  // ════════════════════════════════════════════

  const eventMap = useMemo(() => {
    const map = new Map<string, { event: any; slots: any[] }>();
    upcomingSlots.forEach((slot) => {
      const ev = slot.events;
      if (!ev) return;
      if (!map.has(ev.id)) map.set(ev.id, { event: ev, slots: [] });
      map.get(ev.id)!.slots.push(slot);
    });
    return Array.from(map.values()).sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime());
  }, [upcomingSlots]);

  function getFighterName(id: string | null) {
    if (!id) return "TBA";
    const f = roster.find((r) => r.id === id);
    return f?.name || "Unknown";
  }

  // ════════════════════════════════════════════
  // SECTION 4: Roster Performance
  // ════════════════════════════════════════════

  const rosterRecords = useMemo(() => {
    return roster.map((f) => {
      const rec = getFighterRecord(f.id);
      const totalWins = rec.wins;
      const winFights = allFights.filter((fight) => {
        const isA = fight.fighter_a_id === f.id;
        const isB = fight.fighter_b_id === f.id;
        if (!isA && !isB) return false;
        if (fight.winner_id === f.id) return true;
        const isSelfRef = fight.fighter_a_id === fight.fighter_b_id;
        if (fight.result === "win" && (isSelfRef || isA)) return true;
        if (fight.result === "loss" && !isSelfRef && isB) return true;
        return false;
      });
      const finishes = winFights.filter((fight) => {
        const m = (fight.method || "").toLowerCase();
        return m.includes("ko") || m.includes("tko") || m.includes("sub");
      }).length;
      const finishRate = totalWins > 0 ? Math.round((finishes / totalWins) * 100) : 0;
      const lastFight = getLastFightDate(f.id);
      return { ...f, ...rec, finishRate, lastFight, totalFights: rec.wins + rec.losses + rec.draws };
    });
  }, [roster, allFights]);

  const wldChartData = rosterRecords.slice(0, 8).map((f) => ({
    name: f.name?.split(" ")[0] ?? "?",
    id: f.id,
    Wins: f.wins,
    Losses: f.losses,
    Draws: f.draws,
  }));

  const finishChartData = rosterRecords.slice(0, 8).map((f) => ({
    name: f.name?.split(" ")[0] ?? "?",
    "Finish %": f.finishRate,
  }));

  // Recent fights feed
  const recentFights = useMemo(() => {
    return allFights
      .filter((f) => rosterIds.includes(f.fighter_a_id))
      .sort((a, b) => {
        const da = a.event_date ? new Date(a.event_date).getTime() : 0;
        const db = b.event_date ? new Date(b.event_date).getTime() : 0;
        return db - da;
      })
      .slice(0, 6);
  }, [allFights, rosterIds]);

  // Leaderboard
  const leaderboard = useMemo(() => {
    return [...rosterRecords]
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 7);
  }, [rosterRecords]);

  // ════════════════════════════════════════════
  // SECTION 5: Gym Growth
  // ════════════════════════════════════════════

  const trialThisMonth = gymLeads.filter((l) =>
    l.type === "trial_request" &&
    new Date(l.created_at).getMonth() === now.getMonth() &&
    new Date(l.created_at).getFullYear() === now.getFullYear()
  ).length;

  const convertedLeads = gymLeads.filter((l) => l.status === "converted").length;
  const conversionRate = gymLeads.length > 0 ? Math.round((convertedLeads / gymLeads.length) * 100) : 0;

  const profileViewCount = reachPeriod === "30d"
    ? profileViews.filter((v) => differenceInDays(now, new Date(v.viewed_at)) <= 30).length
    : profileViews.length;

  // Leads over last 3 months (line chart)
  const leadsLineData = useMemo(() => {
    const months: { month: string; Trials: number; Affiliations: number }[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = subMonths(now, i);
      const label = format(d, "MMM");
      const m = d.getMonth();
      const y = d.getFullYear();
      const trials = gymLeads.filter((l) => l.type === "trial_request" && new Date(l.created_at).getMonth() === m && new Date(l.created_at).getFullYear() === y).length;
      const affiliations = pendingGymLinks.length; // approximate: total pending
      // Actually count new gym_leads by type
      const interests = gymLeads.filter((l) => l.type !== "trial_request" && new Date(l.created_at).getMonth() === m && new Date(l.created_at).getFullYear() === y).length;
      months.push({ month: label, Trials: trials, Affiliations: interests });
    }
    return months;
  }, [gymLeads, now]);

  // Funnel — exact status counts per stage
  const funnelData = useMemo(() => {
    const total = gymLeads.length;
    const contacted = gymLeads.filter((l) => l.status === "contacted").length;
    const trialAttended = gymLeads.filter((l) => l.status === "trial_attended").length;
    const converted = gymLeads.filter((l) => l.status === "converted").length;
    return [
      { label: "Leads Generated", count: total, pct: 100, color: "hsl(var(--chart-3))" },
      { label: "Contacted", count: contacted, pct: total > 0 ? Math.round((contacted / total) * 100) : 0, color: "hsl(var(--chart-4))" },
      { label: "Trial Attended", count: trialAttended, pct: total > 0 ? Math.round((trialAttended / total) * 100) : 0, color: "hsl(var(--primary))" },
      { label: "Active Member", count: converted, pct: total > 0 ? Math.round((converted / total) * 100) : 0, color: "hsl(var(--chart-1))" },
    ];
  }, [gymLeads]);

  // ════════════════════════════════════════════
  // SECTION 6: Lead Source & Pipeline
  // ════════════════════════════════════════════

  const leadSourceData = useMemo(() => {
    // gym_leads doesn't have a source field, show placeholder segments
    const types = { "Fighter Interest": 0, "Direct Search": 0, "Event Listing": 0, "Referral": 0 };
    gymLeads.forEach((l, i) => {
      // Distribute evenly as placeholder
      const keys = Object.keys(types) as (keyof typeof types)[];
      types[keys[i % keys.length]]++;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value: value || 0 }));
  }, [gymLeads]);

  const DONUT_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-3))", "hsl(var(--chart-1))", "hsl(var(--chart-4))"];

  const pipelineColumns = useMemo(() => {
    const cols = [
      { label: "Requested", status: "pending", items: [] as any[] },
      { label: "Contacted", status: "contacted", items: [] as any[] },
      { label: "Trial Booked", status: "trial_attended", items: [] as any[] },
      { label: "Converted", status: "converted", items: [] as any[] },
    ];
    gymLeads.forEach((l) => {
      const col = cols.find((c) => c.status === l.status) || cols[0];
      col.items.push(l);
    });
    return cols;
  }, [gymLeads]);

  const STATUS_ORDER = ["pending", "contacted", "trial_attended", "converted"];
  const [pipelineModalStatus, setPipelineModalStatus] = useState<string | null>(null);

  const handleLeadMove = async (leadId: string, currentStatus: string, direction: "forward" | "back") => {
    const idx = STATUS_ORDER.indexOf(currentStatus);
    const newIdx = direction === "forward" ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= STATUS_ORDER.length) return;
    const newStatus = STATUS_ORDER[newIdx];
    const { error } = await supabase.from("gym_leads").update({ status: newStatus }).eq("id", leadId);
    if (error) { toast.error("Failed to update lead status"); return; }
    queryClient.invalidateQueries({ queryKey: ["coach-analytics-gym-leads"] });
    toast.success(`Lead moved to ${newStatus.replace(/_/g, " ")}`);
  };

  const handleLeadDelete = async (leadId: string) => {
    const { error } = await supabase.from("gym_leads").delete().eq("id", leadId);
    if (error) { toast.error("Failed to delete lead"); return; }
    queryClient.invalidateQueries({ queryKey: ["coach-analytics-gym-leads"] });
    toast.success("Lead deleted");
  };

  const pipelineModalItems = useMemo(() => {
    if (!pipelineModalStatus) return [];
    const col = pipelineColumns.find((c) => c.status === pipelineModalStatus);
    return col?.items ?? [];
  }, [pipelineModalStatus, pipelineColumns]);

  // ════════════════════════════════════════════
  // Active Fighters Modal Data
  // ════════════════════════════════════════════

  const activeFightersList = useMemo(() => {
    return roster.map((f) => {
      const last = getLastFightDate(f.id);
      if (!last || last < cutoffDate) return null;
      const monthsAgo = differenceInDays(now, last) / 30;
      let status: "green" | "gold" | "grey" = "grey";
      if (monthsAgo <= 3) status = "green";
      else if (monthsAgo <= 6) status = "gold";
      return { ...f, lastFight: last, status };
    }).filter(Boolean) as any[];
  }, [roster, allFights, cutoffDate]);

  return (
    <div className="space-y-1">
      {/* Page header */}
      <div className="flex items-end justify-between mb-2">
        <h2 className="font-heading text-2xl text-foreground">
          Coach <span className="text-primary">Analytics</span>
        </h2>
        <div className="font-heading text-sm font-bold text-muted-foreground bg-accent border border-border px-4 py-2 rounded-md">
          Active Gyms: <span className="text-foreground">{myGyms.length}</span> &nbsp;·&nbsp; Roster: <span className="text-foreground">{roster.length} fighters</span>
        </div>
      </div>

      {/* ── SECTION 1: Roster Overview ── */}
      <SectionHeader title="Roster Overview" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mb-3">
        <StatCard label="Total Fighters" value={roster.length} sub={`Across ${myGyms.length} gym${myGyms.length !== 1 ? "s" : ""}`} />
        <StatCard
          label="Active Fighters"
          value={activeFighters.length}
          sub={`Competed in last ${cutoffMonths} months`}
          toggle={<Toggle value={activeMonths} onChange={(v) => setActiveMonths(v as "6m" | "12m")} options={["6M", "12M"]} />}
          onClick={() => setShowActiveModal(true)}
          clickHint="↗ Tap to see fighter list"
        />
        <StatCard label="Roster Win Rate" value={`${rosterTotals.winPct}%`} sub="Aggregate across all fighters" />
        <StatCard label="Pending Proposals" value={pendingSuggestions} sub="Awaiting response" alert={pendingSuggestions > 0} />
        <StatCard label="Upcoming Events" value={upcomingEventIds.length} sub="Fighters entered or proposed" />
      </div>

      {/* ── SECTION 2: Matchmaking Activity ── */}
      <SectionHeader title="Matchmaking Activity" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard label="Proposal Acceptance Rate" value={`${acceptanceRate}%`} sub={`${confirmedSuggestions} accepted of ${totalSuggestions}`} />
        <StatCard label="Fights Booked – 30d" value={bookedInDays(30)} sub="Confirmed matchups" />
        <StatCard label="Fights Booked – 60d" value={bookedInDays(60)} sub="Confirmed matchups" />
        <StatCard label="Fights Booked – 90d" value={bookedInDays(90)} sub="Confirmed matchups" />
      </div>

      {/* ── SECTION 3: Upcoming Events ── */}
      <SectionHeader title="Upcoming Events" />
      <div className="bg-card border border-border rounded-lg p-4 mb-3">
        <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3">Events with Roster Participation</h3>
        {eventMap.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No upcoming events with roster participation.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {eventMap.map(({ event, slots }) => {
              const daysUntil = differenceInDays(new Date(event.date), now);
              const confirmedSlots = slots.filter((s) => s.status === "confirmed").length;
              return (
                <div key={event.id} className="bg-accent border border-border rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-heading text-sm font-bold text-foreground">{event.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {event.city || event.venue_name || "TBA"} · {format(new Date(event.date), "d MMM yyyy")} · {daysUntil} days away
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-heading text-xs font-bold ${confirmedSlots === slots.length ? "text-green-500" : "text-primary"}`}>
                        {confirmedSlots} / {slots.length} slots confirmed
                      </div>
                      <div className="font-heading text-[11px] tracking-[1px] uppercase text-muted-foreground mt-0.5">
                        {format(new Date(event.date), "MMM d")}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-border">
                    {slots.map((slot) => {
                      const aName = getFighterName(slot.fighter_a_id);
                      const bName = getFighterName(slot.fighter_b_id);
                      const names = [aName, bName].filter((n) => rosterIds.includes(slot.fighter_a_id) || rosterIds.includes(slot.fighter_b_id));
                      const isConfirmed = slot.status === "confirmed";
                      const isPending = slot.status === "proposed";
                      return (
                        <span
                          key={slot.id}
                          className={`font-heading text-[10px] font-bold bg-card border border-border px-2 py-0.5 rounded tracking-[0.5px] ${isConfirmed ? "text-green-500" : isPending ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {rosterIds.includes(slot.fighter_a_id) ? getFighterName(slot.fighter_a_id) : getFighterName(slot.fighter_b_id)}
                           · {slot.weight_class ? formatEnum(slot.weight_class) : "Open"} · {isConfirmed ? "✓ Confirmed" : isPending ? "Pending" : "Proposal sent"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SECTION 4: Roster Performance ── */}
      <SectionHeader title="Roster Performance" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        {/* W/L/D Chart */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3">Win / Loss / Draw by Fighter</h3>
          {wldChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={wldChartData} layout="vertical" onClick={(state) => {
                if (state?.activePayload?.[0]?.payload?.id) {
                  navigate(`/fighters/${state.activePayload[0].payload.id}`);
                }
              }} style={{ cursor: "pointer" }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="Wins" fill="hsl(var(--primary))" radius={[0, 2, 2, 0]} className="cursor-pointer" />
                <Bar dataKey="Losses" fill="hsl(var(--destructive))" radius={[0, 2, 2, 0]} className="cursor-pointer" />
                <Bar dataKey="Draws" fill="hsl(var(--chart-3))" radius={[0, 2, 2, 0]} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No fight data yet.</p>
          )}
        </div>

        {/* Finish Rate Chart */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3 flex items-center justify-between">
            Finish Rate by Fighter
            <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full">KO + Sub %</span>
          </h3>
          {finishChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={finishChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Finish %" fill="hsl(var(--primary))" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No fight data yet.</p>
          )}
        </div>
      </div>

      {/* Recent Feed + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-3">
        {/* Recent Fight Results Feed */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-4">
          <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3">Recent Fight Results Feed</h3>
          {recentFights.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No recent fights.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentFights.map((fight) => {
                const isWin = fight.result === "win" || fight.winner_id === fight.fighter_a_id;
                const isLoss = fight.result === "loss" || (fight.winner_id && fight.winner_id !== fight.fighter_a_id);
                const resultLabel = fight.result === "draw" ? "D" : isWin ? "W" : "L";
                const fighterName = getFighterName(fight.fighter_a_id);
                const opponentName = fight.opponent_name || getFighterName(fight.fighter_b_id);
                return (
                  <div key={fight.id} className="bg-accent border border-border rounded-md p-2.5 flex items-center gap-3">
                    <span className={`font-heading text-[11px] font-bold px-2.5 py-0.5 rounded ${resultLabel === "W" ? "bg-primary/10 text-primary border border-primary/20" : resultLabel === "L" ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-chart-3/10 text-chart-3 border border-chart-3/20"}`}>
                      {resultLabel}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-heading text-sm font-bold text-foreground truncate">{fighterName} vs {opponentName}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {fight.method || "Decision"} {fight.round ? `R${fight.round}` : ""} · {fight.event_name || "Unknown Event"} · {fight.weight_class ? formatEnum(fight.weight_class) : ""}
                      </div>
                    </div>
                    <div className="font-heading text-[11px] text-muted-foreground shrink-0">
                      {fight.event_date ? format(new Date(fight.event_date), "MMM yyyy") : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fighter Leaderboard */}
        <div className="lg:col-span-3 bg-card border border-border rounded-lg p-4">
          <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3 flex items-center justify-between">
            Fighter Leaderboard
            <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full">By Wins</span>
          </h3>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No fighter data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-[10px] tracking-[1.8px] uppercase text-muted-foreground font-heading font-bold">#</th>
                    <th className="text-left py-2 px-2 text-[10px] tracking-[1.8px] uppercase text-muted-foreground font-heading font-bold">Fighter</th>
                    <th className="text-left py-2 px-2 text-[10px] tracking-[1.8px] uppercase text-muted-foreground font-heading font-bold">Record</th>
                    <th className="text-left py-2 px-2 text-[10px] tracking-[1.8px] uppercase text-muted-foreground font-heading font-bold">Class</th>
                    <th className="text-left py-2 px-2 text-[10px] tracking-[1.8px] uppercase text-muted-foreground font-heading font-bold">Wins</th>
                    <th className="text-left py-2 px-2 text-[10px] tracking-[1.8px] uppercase text-muted-foreground font-heading font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((f, i) => {
                    const lastFight = getLastFightDate(f.id);
                    const isActive = lastFight && differenceInDays(now, lastFight) < 180;
                    return (
                      <tr key={f.id} className="border-b border-border/50">
                        <td className="py-2 px-2 text-muted-foreground font-heading font-bold">#{i + 1}</td>
                        <td className="py-2 px-2 font-heading font-bold text-foreground">{f.name}</td>
                        <td className="py-2 px-2">
                          <span className="text-primary font-bold">{f.wins}</span>-<span className="text-destructive font-bold">{f.losses}</span>-<span className="text-muted-foreground font-bold">{f.draws}</span>
                        </td>
                        <td className="py-2 px-2 text-foreground">{f.weight_class ? formatEnum(f.weight_class).slice(0, 7) : "—"}</td>
                        <td className="py-2 px-2 text-primary font-bold">{f.wins}</td>
                        <td className="py-2 px-2">
                          <span className="flex items-center gap-1.5">
                            <span className={`inline-block w-[7px] h-[7px] rounded-full ${isActive ? "bg-green-500 shadow-[0_0_6px_theme(colors.green.500)]" : "bg-muted-foreground"}`} />
                            <span className="text-[11px]">{isActive ? "Active" : "Inactive"}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 5: Gym Growth & Lead Generation ── */}
      <SectionHeader title="Gym Growth & Lead Generation" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard label="Trial Session Requests" value={trialThisMonth} sub="This month" />
        <StatCard label="Gym Affiliation Requests" value={pendingGymLinks.length} sub="Fighters requesting to join" />
        <StatCard label="Lead Conversion Rate" value={`${conversionRate}%`} sub={gymLeads.length > 0 ? `${convertedLeads} of ${gymLeads.length} leads` : "No leads yet"} />
        <StatCard
          label="Profile Reach"
          value={profileViewCount.toLocaleString()}
          sub={reachPeriod === "30d" ? "Gym profile views – last 30 days" : "Total gym profile views (all time)"}
          toggle={<Toggle value={reachPeriod} onChange={(v) => setReachPeriod(v as "30d" | "all")} options={["30D", "All"]} />}
        />
      </div>

      {/* Leads line chart + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3 flex items-center justify-between">
            Trial & Affiliation Requests
            <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full">Last 90 Days</span>
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={leadsLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="Trials" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
              <Line type="monotone" dataKey="Affiliations" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--chart-1))" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3">Lead Conversion Funnel</h3>
          <div className="flex flex-col gap-1.5">
            {funnelData.map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                <span className="font-heading text-[11px] tracking-[1.2px] uppercase text-muted-foreground min-w-[120px]">{step.label}</span>
                <div className="flex-1 bg-accent rounded h-7 overflow-hidden">
                  <div
                    className="h-full rounded flex items-center pl-2.5 font-heading text-xs font-bold text-background"
                    style={{ width: `${Math.max(step.pct, 5)}%`, backgroundColor: step.color }}
                  >
                    {step.count} {step.label.toLowerCase().includes("lead") ? "total" : ""}
                  </div>
                </div>
                <span className="font-heading text-xs font-bold min-w-[36px] text-right text-muted-foreground">{step.pct}%</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2.5 mt-3.5">
            <div className="bg-accent rounded-md px-4 py-2.5 text-center">
              <div className="font-heading text-xl font-extrabold text-green-500">{conversionRate}%</div>
              <div className="font-heading text-[10px] tracking-[1.2px] uppercase text-muted-foreground mt-0.5">Conversion Rate</div>
            </div>
            <div className="bg-accent rounded-md px-4 py-2.5 text-center">
              <div className="font-heading text-xl font-extrabold text-primary">{trialThisMonth}</div>
              <div className="font-heading text-[10px] tracking-[1.2px] uppercase text-muted-foreground mt-0.5">Trials This Month</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 6: Lead Source & Pipeline ── */}
      <SectionHeader title="Lead Source & Pipeline" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        {/* Doughnut */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3">Lead Source Breakdown</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={leadSourceData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                  {leadSourceData.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline — Count Tiles */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-heading text-sm font-bold tracking-[1.5px] uppercase text-foreground mb-3 flex items-center justify-between">
            Lead Pipeline
            {pipelineColumns[0].items.length > 0 && (
              <span className="text-[10px] bg-destructive/10 border border-destructive/20 text-destructive px-2 py-0.5 rounded-full">
                {pipelineColumns[0].items.length} Need Action
              </span>
            )}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {pipelineColumns.map((col) => (
              <button
                key={col.label}
                onClick={() => setPipelineModalStatus(col.status)}
                className="bg-accent rounded-md p-4 text-center cursor-pointer hover:border-primary/50 border border-border transition-colors"
              >
                <div className="font-heading text-3xl font-extrabold text-primary">{col.items.length}</div>
                <div className="font-heading text-[10px] tracking-[1.8px] uppercase text-muted-foreground mt-1">{col.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Lead Pipeline Popup Modal ── */}
      <Dialog open={!!pipelineModalStatus} onOpenChange={(open) => { if (!open) setPipelineModalStatus(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">
              {pipelineColumns.find((c) => c.status === pipelineModalStatus)?.label || ""} Leads
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {pipelineModalItems.length} lead{pipelineModalItems.length !== 1 ? "s" : ""} at this stage
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {pipelineModalItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No leads at this stage.</p>
            ) : (
              pipelineModalItems.map((item) => {
                const colIdx = STATUS_ORDER.indexOf(pipelineModalStatus!);
                return (
                  <div key={item.id} className="bg-accent border border-border rounded-md p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-heading text-sm font-bold text-foreground truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{item.email}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {item.type === "trial_request" ? "Trial Request" : "Interest"} · {format(new Date(item.created_at), "d MMM yyyy")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2.5">
                      <button
                        disabled={colIdx === 0}
                        onClick={() => handleLeadMove(item.id, pipelineModalStatus!, "back")}
                        className="flex items-center gap-0.5 text-[10px] px-2 py-1 rounded border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-3 w-3" /> Back
                      </button>
                      <button
                        disabled={colIdx === STATUS_ORDER.length - 1}
                        onClick={() => handleLeadMove(item.id, pipelineModalStatus!, "forward")}
                        className="flex items-center gap-0.5 text-[10px] px-2 py-1 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Forward <ChevronRight className="h-3 w-3" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="flex items-center gap-0.5 text-[10px] px-2 py-1 rounded border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors ml-auto">
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                            <AlertDialogDescription>Permanently delete {item.name}'s lead record? This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleLeadDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── SECTION 7: Organiser Analytics ── */}
      {showOrganiserSection && (
        <>
          <div className="flex items-end justify-between mb-2 mt-8">
            <h2 className="font-heading text-2xl text-foreground">
              Organiser <span className="text-primary">Analytics</span>
            </h2>
          </div>
          <OrganiserAnalyticsShared userId={userId} embedded />
        </>
      )}

      {/* ── Active Fighters Modal ── */}
      {showActiveModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4" onClick={() => setShowActiveModal(false)}>
          <div className="bg-card border border-border rounded-xl p-7 max-w-[560px] w-full max-h-[82vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-3.5 right-4 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowActiveModal(false)}>
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-heading text-xl font-extrabold text-primary mb-4 tracking-[1px]">
              Active Fighters – Last {cutoffMonths} Months
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {activeFightersList.length} fighters competed in the last {cutoffMonths} months. {roster.length - activeFightersList.length} are currently inactive.
            </p>
            <div className="flex flex-col gap-2">
              {activeFightersList.map((f: any) => (
                <div key={f.id} className="bg-accent rounded-md p-3 flex items-center justify-between">
                  <div>
                    <div className="font-heading text-sm font-bold text-foreground">{f.name}</div>
                    <div className="text-[11px] text-muted-foreground">{f.weight_class ? formatEnum(f.weight_class) : "—"} · Last fight: {f.lastFight ? format(f.lastFight, "MMM yyyy") : "—"}</div>
                  </div>
                  <div className="flex items-center gap-1.5 font-heading text-[11px] font-bold">
                    <span className={`inline-block w-[7px] h-[7px] rounded-full ${f.status === "green" ? "bg-green-500 shadow-[0_0_6px_theme(colors.green.500)]" : f.status === "gold" ? "bg-primary" : "bg-muted-foreground"}`} />
                    {f.status === "green" ? "Recent" : f.status === "gold" ? "This period" : "End of period"}
                  </div>
                </div>
              ))}
              {activeFightersList.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No active fighters in this period.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
