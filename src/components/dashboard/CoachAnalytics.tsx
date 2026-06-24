import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { subMonths } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  AnalyticsShell,
  AnalyticsCard,
  ProgressRow,
  PillToggle,
  ANALYTICS_TOKENS,
  KPI,
} from "@/components/analytics/AnalyticsShell";

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg p-2 text-xs"
      style={{
        background: ANALYTICS_TOKENS.RAISED,
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        color: "#e8eaf0",
      }}
    >
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export function CoachAnalyticsV2({ userId, title = "Analytics" }: { userId: string; title?: string }) {
  const now = new Date();
  const [bookedWindow, setBookedWindow] = useState<"30" | "60" | "90">("30");

  // ── Roster: coach's gyms + linked fighters ──
  const { data: myGyms = [] } = useQuery({
    queryKey: ["coach-analytics-gyms", userId],
    queryFn: async () => {
      const { data } = await supabase.from("gyms").select("id, name").eq("coach_id", userId);
      return data ?? [];
    },
  });
  const gymIds = myGyms.map((g) => g.id);

  const { data: createdFighters = [] } = useQuery({
    queryKey: ["coach-analytics-created-fighters", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_profiles")
        .select("*")
        .eq("created_by_coach_id", userId);
      return data ?? [];
    },
  });

  const { data: gymLinks = [] } = useQuery({
    queryKey: ["coach-analytics-gym-links", gymIds],
    queryFn: async () => {
      if (gymIds.length === 0) return [];
      const { data } = await supabase
        .from("fighter_gym_links")
        .select("fighter_id, gym_id")
        .in("gym_id", gymIds)
        .eq("status", "approved");
      return data ?? [];
    },
    enabled: gymIds.length > 0,
  });

  const linkedFighterIds = [...new Set(gymLinks.map((l) => l.fighter_id))];

  const { data: linkedFighters = [] } = useQuery({
    queryKey: ["coach-analytics-linked-fighters", linkedFighterIds],
    queryFn: async () => {
      if (linkedFighterIds.length === 0) return [];
      const { data } = await supabase
        .from("fighter_profiles")
        .select("*")
        .in("id", linkedFighterIds);
      return data ?? [];
    },
    enabled: linkedFighterIds.length > 0,
  });

  const roster = useMemo(() => {
    const map = new Map<string, any>();
    [...createdFighters, ...linkedFighters].forEach((f) => map.set(f.id, f));
    return Array.from(map.values());
  }, [createdFighters, linkedFighters]);
  const rosterIds = roster.map((f) => f.id);

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

  const { data: suggestions = [] } = useQuery({
    queryKey: ["coach-analytics-suggestions", rosterIds],
    queryFn: async () => {
      if (rosterIds.length === 0) return [];
      const { data: a } = await supabase
        .from("match_suggestions")
        .select("*")
        .in("fighter_a_id", rosterIds);
      const { data: b } = await supabase
        .from("match_suggestions")
        .select("*")
        .in("fighter_b_id", rosterIds);
      const map = new Map<string, any>();
      [...(a || []), ...(b || [])].forEach((s) => map.set(s.id, s));
      return Array.from(map.values());
    },
    enabled: rosterIds.length > 0,
  });

  const { data: fightSlots = [] } = useQuery({
    queryKey: ["coach-analytics-fight-slots", rosterIds],
    queryFn: async () => {
      if (rosterIds.length === 0) return [];
      const { data: a } = await supabase
        .from("event_fight_slots")
        .select("*, events(id, title, date, city, venue_name)")
        .in("fighter_a_id", rosterIds);
      const { data: b } = await supabase
        .from("event_fight_slots")
        .select("*, events(id, title, date, city, venue_name)")
        .in("fighter_b_id", rosterIds);
      const map = new Map<string, any>();
      [...(a || []), ...(b || [])].forEach((s) => map.set(s.id, s));
      return Array.from(map.values());
    },
    enabled: rosterIds.length > 0,
  });

  // ── Helpers ──
  function getRecord(fighterId: string) {
    let w = 0,
      l = 0,
      d = 0;
    allFights.forEach((f) => {
      const isA = f.fighter_a_id === fighterId;
      const isB = f.fighter_b_id === fighterId;
      if (!isA && !isB) return;
      if (f.winner_id === fighterId) w++;
      else if (f.winner_id) l++;
      else if (f.result === "draw") d++;
      else if (f.result === "win" && isA) w++;
      else if (f.result === "loss" && isA) l++;
    });
    return { wins: w, losses: l, draws: d };
  }

  function getLastFightDate(fighterId: string) {
    const dates = allFights
      .filter((f) => f.fighter_a_id === fighterId || f.fighter_b_id === fighterId)
      .map((f) => (f.event_date ? new Date(f.event_date).getTime() : 0))
      .filter(Boolean);
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates));
  }

  // ── KPIs ──
  const totalFighters = roster.length;
  const sixMonthsAgo = subMonths(now, 6);
  const activeFighters = roster.filter((f) => {
    const last = getLastFightDate(f.id);
    return last && last >= sixMonthsAgo;
  }).length;

  const rosterTotals = useMemo(() => {
    let w = 0,
      l = 0,
      d = 0;
    roster.forEach((f) => {
      const r = getRecord(f.id);
      w += r.wins;
      l += r.losses;
      d += r.draws;
    });
    const total = w + l + d;
    return {
      wins: w,
      losses: l,
      draws: d,
      total,
      winPct: total > 0 ? Math.round((w / total) * 100) : 0,
    };
  }, [roster, allFights]);

  const pendingProposals = suggestions.filter(
    (s) => s.status === "suggested" || s.status === "pending"
  ).length;

  const kpis: KPI[] = [
    { label: "Total Fighters", value: totalFighters, sub: "On your roster" },
    {
      label: "Active Fighters",
      value: activeFighters,
      progress: totalFighters > 0 ? Math.round((activeFighters / totalFighters) * 100) : 0,
      sub: "Fought in last 6 months",
    },
    {
      label: "Roster Win Rate",
      value: `${rosterTotals.winPct}%`,
      progress: rosterTotals.winPct,
      sub: `${rosterTotals.wins}W · ${rosterTotals.losses}L · ${rosterTotals.draws}D`,
    },
    { label: "Pending Proposals", value: pendingProposals, sub: "Awaiting response" },
  ];

  // ── Tab 1: Overview ──
  const upcomingSlots = fightSlots.filter(
    (s) => s.events && new Date(s.events.date) >= now
  );
  const upcomingEventsMap = useMemo(() => {
    const map = new Map<string, { event: any; slots: any[] }>();
    upcomingSlots.forEach((s) => {
      const ev = s.events;
      if (!ev) return;
      if (!map.has(ev.id)) map.set(ev.id, { event: ev, slots: [] });
      map.get(ev.id)!.slots.push(s);
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime()
    );
  }, [upcomingSlots]);

  const disciplineCounts = useMemo(() => {
    const c: Record<string, number> = {};
    roster.forEach((f) => {
      const k = f.discipline || "Unknown";
      c[k] = (c[k] || 0) + 1;
    });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [roster]);

  const overview = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <AnalyticsCard title="Roster Summary">
        <div className="flex flex-col gap-3">
          {disciplineCounts.length === 0 && (
            <p className="text-sm" style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
              No fighters on your roster yet.
            </p>
          )}
          {disciplineCounts.map(([name, count]) => (
            <ProgressRow
              key={name}
              label={name}
              value={count}
              max={totalFighters}
              rightLabel={`${count}`}
            />
          ))}
        </div>
      </AnalyticsCard>

      <AnalyticsCard title="Upcoming Events with Roster">
        {upcomingEventsMap.length === 0 ? (
          <p className="text-sm" style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
            No upcoming events involve your roster.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcomingEventsMap.slice(0, 8).map(({ event, slots }) => (
              <li
                key={event.id}
                className="rounded-lg px-4 py-3 flex items-center justify-between"
                style={{ background: ANALYTICS_TOKENS.RAISED }}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "#e8eaf0" }}>
                    {event.title}
                  </div>
                  <div className="text-[11px]" style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
                    {event.date} · {event.city || event.venue_name || "—"}
                  </div>
                </div>
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: ANALYTICS_TOKENS.GOLD_DIM,
                    color: ANALYTICS_TOKENS.GOLD,
                    letterSpacing: "0.08em",
                  }}
                >
                  {slots.length} ROSTER
                </span>
              </li>
            ))}
          </ul>
        )}
      </AnalyticsCard>
    </div>
  );

  // ── Tab 2: Matchmaking ──
  const totalSuggestions = suggestions.length;
  const confirmedSuggestions = suggestions.filter((s) => s.status === "confirmed").length;
  const acceptanceRate =
    totalSuggestions > 0 ? Math.round((confirmedSuggestions / totalSuggestions) * 100) : 0;

  const bookedDays = Number(bookedWindow);
  const bookedCutoff = new Date(now.getTime() + bookedDays * 86400000);
  const bookedCount = upcomingSlots.filter(
    (s) => s.status === "confirmed" && new Date(s.events.date) <= bookedCutoff
  ).length;

  const confirmedWithDates = suggestions.filter(
    (s) => s.status === "confirmed" && s.created_at && s.updated_at
  );
  const avgConfirmHours =
    confirmedWithDates.length > 0
      ? Math.round(
          confirmedWithDates.reduce((sum, s) => {
            const diff =
              new Date(s.updated_at).getTime() - new Date(s.created_at).getTime();
            return sum + diff / 3600000;
          }, 0) / confirmedWithDates.length
        )
      : 0;
  const avgConfirmLabel =
    avgConfirmHours > 0
      ? avgConfirmHours >= 24
        ? `${Math.round(avgConfirmHours / 24)}d`
        : `${avgConfirmHours}h`
      : "—";

  const matchmaking = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <AnalyticsCard title="Acceptance Rate">
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 44,
            color: ANALYTICS_TOKENS.GOLD,
            letterSpacing: "0.04em",
          }}
        >
          {acceptanceRate}%
        </div>
        <div className="mt-3">
          <ProgressRow
            label="Confirmed"
            value={confirmedSuggestions}
            max={Math.max(totalSuggestions, 1)}
            rightLabel={`${confirmedSuggestions}/${totalSuggestions}`}
          />
        </div>
      </AnalyticsCard>

      <AnalyticsCard
        title="Fights Booked"
        action={
          <PillToggle<"30" | "60" | "90">
            value={bookedWindow}
            onChange={setBookedWindow}
            options={[
              { value: "30", label: "30D" },
              { value: "60", label: "60D" },
              { value: "90", label: "90D" },
            ]}
          />
        }
      >
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 44,
            color: ANALYTICS_TOKENS.GOLD,
            letterSpacing: "0.04em",
          }}
        >
          {bookedCount}
        </div>
        <p className="text-[12px] mt-2" style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
          Confirmed bouts in the next {bookedWindow} days
        </p>
      </AnalyticsCard>

      <AnalyticsCard title="Avg Time to Confirm">
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 44,
            color: ANALYTICS_TOKENS.GOLD,
            letterSpacing: "0.04em",
          }}
        >
          {avgConfirmLabel}
        </div>
        <p className="text-[12px] mt-2" style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
          From suggestion to confirmation
        </p>
      </AnalyticsCard>
    </div>
  );

  // ── Tab 3: Performance ──
  const rosterRecords = useMemo(() => {
    return roster
      .map((f) => {
        const rec = getRecord(f.id);
        const winFights = allFights.filter((fight) => {
          const isA = fight.fighter_a_id === f.id;
          if (fight.winner_id === f.id) return true;
          if (fight.result === "win" && isA) return true;
          return false;
        });
        const finishes = winFights.filter((fight) => {
          const m = (fight.method || "").toLowerCase();
          return m.includes("ko") || m.includes("tko") || m.includes("sub");
        }).length;
        const finishRate = rec.wins > 0 ? Math.round((finishes / rec.wins) * 100) : 0;
        return { ...f, ...rec, finishRate, total: rec.wins + rec.losses + rec.draws };
      })
      .filter((f) => f.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [roster, allFights]);

  const wldData = rosterRecords.map((f) => ({
    name: (f.name || "?").split(" ")[0],
    Wins: f.wins,
    Losses: f.losses,
    Draws: f.draws,
  }));

  const finishData = rosterRecords.map((f) => ({
    name: (f.name || "?").split(" ")[0],
    "Finish %": f.finishRate,
  }));

  const axisColor = ANALYTICS_TOKENS.TEXT_MUTED;

  const performance = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <AnalyticsCard title="Win / Loss / Draw by Fighter">
        {wldData.length === 0 ? (
          <p className="text-sm" style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
            No fight records to chart.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={wldData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(239,68,68,0.06)" }} />
              <Legend wrapperStyle={{ color: axisColor, fontSize: 11 }} />
              <Bar dataKey="Wins" stackId="r" fill={ANALYTICS_TOKENS.GOLD} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Losses" stackId="r" fill="#555b6b" />
              <Bar dataKey="Draws" stackId="r" fill="#2d3140" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </AnalyticsCard>

      <AnalyticsCard title="Finish Rate by Fighter">
        {finishData.length === 0 ? (
          <p className="text-sm" style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
            No finishes recorded.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={finishData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(239,68,68,0.06)" }} />
              <Bar dataKey="Finish %" fill={ANALYTICS_TOKENS.GOLD} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </AnalyticsCard>
    </div>
  );

  return (
    <AnalyticsShell
      title={title}
      kpis={kpis}
      tabs={[
        { value: "overview", label: "Overview", content: overview },
        { value: "matchmaking", label: "Matchmaking", content: matchmaking },
        { value: "performance", label: "Performance", content: performance },
      ]}
    />
  );
}
