import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { format } from "date-fns";
import {
  AnalyticsShell,
  AnalyticsCard,
  ProgressRow,
  ANALYTICS_TOKENS,
  KPI,
} from "@/components/analytics/AnalyticsShell";

export function FighterAnalyticsV2({ fighterProfile }: { fighterProfile: any }) {
  const fighterId = fighterProfile.id;

  const { data: fights = [] } = useQuery({
    queryKey: ["fa-fights", fighterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fights")
        .select("*")
        .or(`fighter_a_id.eq.${fighterId},fighter_b_id.eq.${fighterId}`)
        .order("event_date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ["fa-suggestions", fighterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("match_suggestions")
        .select("*")
        .or(`fighter_a_id.eq.${fighterId},fighter_b_id.eq.${fighterId}`);
      return data ?? [];
    },
  });

  const { data: upcomingSlots = [] } = useQuery({
    queryKey: ["fa-upcoming-slots", fighterId],
    queryFn: async () => {
      const { data: a } = await supabase
        .from("event_fight_slots")
        .select("*, events(id, title, date, city, venue_name)")
        .eq("fighter_a_id", fighterId);
      const { data: b } = await supabase
        .from("event_fight_slots")
        .select("*, events(id, title, date, city, venue_name)")
        .eq("fighter_b_id", fighterId);
      const map = new Map<string, any>();
      [...(a || []), ...(b || [])].forEach((s) => map.set(s.id, s));
      return Array.from(map.values());
    },
  });

  const now = new Date();

  const record = useMemo(() => {
    let w = 0,
      l = 0,
      d = 0;
    fights.forEach((f) => {
      if (f.result === "draw") d++;
      else if (f.winner_id === fighterId) w++;
      else if (f.winner_id) l++;
      else if (f.result === "win") w++;
      else if (f.result === "loss") l++;
    });
    return { wins: w, losses: l, draws: d, total: w + l + d };
  }, [fights, fighterId]);

  const upcomingBouts = upcomingSlots.filter(
    (s) => s.events && new Date(s.events.date) >= now
  ).length;

  const pendingProposals = suggestions.filter(
    (s) => s.status === "suggested" || s.status === "pending"
  ).length;

  const confirmedSuggestions = suggestions.filter((s) => s.status === "confirmed").length;
  const totalSuggestions = suggestions.length;
  const acceptanceRate =
    totalSuggestions > 0 ? Math.round((confirmedSuggestions / totalSuggestions) * 100) : 0;

  const recentFights = useMemo(
    () => [...fights].slice(0, 8),
    [fights]
  );

  const kpis: KPI[] = [
    { label: "Total Fights", value: record.total, sub: `${record.wins}W · ${record.losses}L · ${record.draws}D` },
    {
      label: "Win Rate",
      value: record.total > 0 ? `${Math.round((record.wins / record.total) * 100)}%` : "—",
      progress: record.total > 0 ? Math.round((record.wins / record.total) * 100) : 0,
      sub: `${record.wins} wins`,
    },
    { label: "Upcoming Bouts", value: upcomingBouts, sub: "Scheduled fights" },
    { label: "Pending Proposals", value: pendingProposals, sub: "Awaiting response" },
  ];

  const overview = (
    <AnalyticsCard title="Recent Fight History">
      {recentFights.length === 0 ? (
        <p className="text-sm" style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
          No fights recorded yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recentFights.map((f) => {
            const isWin = f.winner_id === fighterId || f.result === "win";
            const isDraw = f.result === "draw";
            const resultColor = isDraw
              ? "#8b909e"
              : isWin
              ? "#22c55e"
              : "#ef4444";
            const resultLabel = isDraw ? "DRAW" : isWin ? "WIN" : "LOSS";
            const opponent =
              f.opponent_name ||
              (f.fighter_a_id === fighterId ? "Opponent" : "Opponent");
            const dateStr = f.event_date
              ? format(new Date(f.event_date), "d MMM yyyy")
              : "—";
            return (
              <li
                key={f.id}
                className="rounded-lg px-4 py-3 flex items-center justify-between gap-3"
                style={{ background: ANALYTICS_TOKENS.RAISED }}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium" style={{ color: "#e8eaf0" }}>
                    vs {opponent}
                  </span>
                  <span className="text-[11px]" style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
                    {f.event_name || "—"} · {dateStr}
                    {f.method ? ` · ${f.method}` : ""}
                  </span>
                </div>
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: `${resultColor}22`,
                    color: resultColor,
                    letterSpacing: "0.08em",
                  }}
                >
                  {resultLabel}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </AnalyticsCard>
  );

  const matchmaking = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <AnalyticsCard title="Proposals Received">
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 48,
            color: ANALYTICS_TOKENS.GOLD,
            letterSpacing: "0.04em",
          }}
        >
          {totalSuggestions}
        </div>
        <p className="text-[12px] mt-2" style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
          Total match suggestions involving you
        </p>
      </AnalyticsCard>

      <AnalyticsCard title="Acceptance Rate">
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 48,
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

      <AnalyticsCard title="Pending Matches">
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 48,
            color: ANALYTICS_TOKENS.GOLD,
            letterSpacing: "0.04em",
          }}
        >
          {pendingProposals}
        </div>
        <p className="text-[12px] mt-2" style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
          Suggested matches awaiting your response
        </p>
      </AnalyticsCard>
    </div>
  );

  return (
    <AnalyticsShell
      title="Analytics"
      kpis={kpis}
      tabs={[
        { value: "overview", label: "Overview", content: overview },
        { value: "matchmaking", label: "Matchmaking", content: matchmaking },
      ]}
    />
  );
}
