import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";
import { ChevronDown, Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";

type FilterMode = "all" | "pro" | "amateur";

const COLORS = {
  wins: "#22c55e",
  draws: "#f59e0b",
  losses: "#ef4444",
};

function ActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius - 2}
      outerRadius={outerRadius + 4}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  );
}

export function FighterRecordHero() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [activeDonutIndex, setActiveDonutIndex] = useState<number | null>(null);
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);

  // Fighter profile
  const { data: fighterProfile } = useQuery({
    queryKey: ["fighter-hero-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_profiles")
        .select("id, name, record_wins, record_losses, record_draws")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // All fights
  const { data: fights = [] } = useQuery({
    queryKey: ["fighter-hero-fights", fighterProfile?.id],
    queryFn: async () => {
      if (!fighterProfile) return [];
      const { data: fA } = await supabase
        .from("fights")
        .select("*")
        .eq("fighter_a_id", fighterProfile.id);
      const { data: fB } = await supabase
        .from("fights")
        .select("*")
        .eq("fighter_b_id", fighterProfile.id);
      const map = new Map<string, any>();
      [...(fA ?? []), ...(fB ?? [])].forEach((f) => map.set(f.id, f));
      return Array.from(map.values());
    },
    enabled: !!fighterProfile,
  });

  // Filter fights
  const filteredFights = useMemo(() => {
    if (filter === "all") return fights;
    if (filter === "pro") return fights.filter((f) => !f.is_amateur);
    return fights.filter((f) => f.is_amateur);
  }, [fights, filter]);

  // Calculate record from filtered fights
  const record = useMemo(() => {
    let wins = 0, losses = 0, draws = 0;
    filteredFights.forEach((fight) => {
      if (!fighterProfile) return;
      const fid = fighterProfile.id;
      if (fight.winner_id === fid) { wins++; return; }
      if (fight.winner_id && fight.winner_id !== fid) { losses++; return; }
      if (fight.result === "draw") { draws++; return; }
      const isA = fight.fighter_a_id === fid;
      if (fight.result === "win") { isA ? wins++ : losses++; return; }
      if (fight.result === "loss") { isA ? losses++ : wins++; return; }
    });
    return { wins, losses, draws, total: wins + losses + draws };
  }, [filteredFights, fighterProfile]);

  // If no fights data, fall back to profile static record
  const displayRecord = useMemo(() => {
    if (fights.length > 0) return record;
    if (!fighterProfile) return { wins: 0, losses: 0, draws: 0, total: 0 };
    const w = fighterProfile.record_wins;
    const l = fighterProfile.record_losses;
    const d = fighterProfile.record_draws;
    return { wins: w, losses: l, draws: d, total: w + l + d };
  }, [record, fights, fighterProfile]);

  // Donut data
  const donutData = useMemo(() => {
    const d = [];
    if (displayRecord.wins > 0) d.push({ name: "Wins", value: displayRecord.wins, color: COLORS.wins });
    if (displayRecord.draws > 0) d.push({ name: "Draws", value: displayRecord.draws, color: COLORS.draws });
    if (displayRecord.losses > 0) d.push({ name: "Losses", value: displayRecord.losses, color: COLORS.losses });
    if (d.length === 0) d.push({ name: "No Fights", value: 1, color: "hsl(var(--muted))" });
    return d;
  }, [displayRecord]);

  // Last 5 fights (most recent first, then reversed for display)
  const last5 = useMemo(() => {
    const sorted = [...filteredFights].sort(
      (a, b) => new Date(b.event_date || b.created_at).getTime() - new Date(a.event_date || a.created_at).getTime()
    ).slice(0, 5);
    return sorted.reverse(); // oldest first for display left-to-right
  }, [filteredFights]);

  // Win rate & streak
  const winRate = displayRecord.total > 0
    ? Math.round((displayRecord.wins / displayRecord.total) * 100)
    : 0;

  const highestStreak = useMemo(() => {
    let maxStreak = 0, streak = 0;
    const sorted = [...filteredFights].sort(
      (a, b) => new Date(a.event_date || a.created_at).getTime() - new Date(b.event_date || b.created_at).getTime()
    );
    sorted.forEach((fight) => {
      if (!fighterProfile) return;
      const fid = fighterProfile.id;
      let isWin = false;
      if (fight.winner_id === fid) isWin = true;
      else if (!fight.winner_id && fight.result === "win" && fight.fighter_a_id === fid) isWin = true;
      if (isWin) { streak++; maxStreak = Math.max(maxStreak, streak); }
      else streak = 0;
    });
    return maxStreak;
  }, [filteredFights, fighterProfile]);

  const getFightResult = (fight: any) => {
    if (!fighterProfile) return "D";
    const fid = fighterProfile.id;
    if (fight.winner_id === fid) return "W";
    if (fight.winner_id && fight.winner_id !== fid) return "L";
    if (fight.result === "draw") return "D";
    const isA = fight.fighter_a_id === fid;
    if (fight.result === "win") return isA ? "W" : "L";
    if (fight.result === "loss") return isA ? "L" : "W";
    return "D";
  };

  const filterLabels: Record<FilterMode, string> = { all: "All", pro: "Pro", amateur: "Amateur" };

  if (!fighterProfile) return null;

  return (
    <div className="coach-card grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
      {/* LEFT: Donut Chart */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg text-foreground">Fight Record</h3>
          <div className="relative">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground bg-transparent border border-border hover:bg-accent/50 transition-colors"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              {filterLabels[filter]}
              <ChevronDown className="h-3 w-3" />
            </button>
            {showFilterMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                <div className="absolute right-0 top-9 z-50 min-w-[140px] rounded-xl border border-border bg-accent shadow-xl p-1.5">
                  {(["all", "pro", "amateur"] as FilterMode[]).map((mode) => (
                    <button
                      key={mode}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs hover:bg-background/50 transition-colors"
                      style={{ color: filter === mode ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
                      onClick={() => { setFilter(mode); setShowFilterMenu(false); }}
                    >
                      {filterLabels[mode]}
                      {filter === mode && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="relative" style={{ width: 200, height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  activeIndex={activeDonutIndex ?? undefined}
                  activeShape={ActiveShape}
                  onMouseEnter={(_, index) => setActiveDonutIndex(index)}
                  onMouseLeave={() => setActiveDonutIndex(null)}
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Centre text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-foreground">{displayRecord.total}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</span>
            </div>
          </div>

          {/* Donut tooltip */}
          {activeDonutIndex !== null && donutData[activeDonutIndex]?.name !== "No Fights" && (
            <div className="mt-2 rounded-lg border border-primary/30 bg-accent px-3.5 py-2.5 text-center">
              <p className="text-xs text-muted-foreground">{donutData[activeDonutIndex].name}</p>
              <p className="font-heading text-2xl" style={{ color: donutData[activeDonutIndex].color }}>
                {donutData[activeDonutIndex].value}
              </p>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-5 mt-4">
            {[
              { label: "Wins", value: displayRecord.wins, color: COLORS.wins },
              { label: "Draws", value: displayRecord.draws, color: COLORS.draws },
              { label: "Losses", value: displayRecord.losses, color: COLORS.losses },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: item.color }} />
                {item.label}: <span className="font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Stats */}
      <div className="p-5 md:p-6 flex flex-col">
        <h4 className="font-heading text-base text-foreground mb-4">Last 5 Fights</h4>

        {/* 5 result circles */}
        <div className="flex items-center gap-3 justify-center mb-1">
          <TooltipProvider>
            {last5.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No fights recorded yet.</p>
            )}
            {last5.map((fight, i) => {
              const result = getFightResult(fight);
              const styles = {
                W: { bg: "rgba(34,197,94,0.2)", border: "#22c55e", color: "#22c55e" },
                L: { bg: "rgba(239,68,68,0.15)", border: "#ef4444", color: "#ef4444" },
                D: { bg: "rgba(245,158,11,0.15)", border: "#f59e0b", color: "#f59e0b" },
              }[result] || { bg: "rgba(245,158,11,0.15)", border: "#f59e0b", color: "#f59e0b" };

              return (
                <Tooltip key={fight.id}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-1 cursor-pointer">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold transition-transform hover:scale-110"
                        style={{
                          background: styles.bg,
                          border: `2px solid ${styles.border}`,
                          color: styles.color,
                        }}
                      >
                        {result}
                      </div>
                      <span className="text-[10px] text-muted-foreground">Fight {last5.length - i}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-accent border-border text-xs">
                    <p className="font-semibold text-foreground">
                      {fight.opponent_name || "Opponent"}
                    </p>
                    <p className="text-muted-foreground">
                      {result === "W" ? "Win" : result === "L" ? "Loss" : "Draw"}
                      {fight.event_date && ` · ${format(new Date(fight.event_date), "MMM d, yyyy")}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>

        {/* Divider */}
        <div className="border-t border-border my-5" />

        {/* Bottom stats */}
        <div className="grid grid-cols-3 divide-x divide-border flex-1">
          {[
            { label: "Total Fights", value: displayRecord.total, key: "total" },
            { label: "Win Rate", value: `${winRate}%`, key: "winrate" },
            { label: "Highest Win Streak", value: highestStreak, key: "streak" },
          ].map((stat) => (
            <div
              key={stat.key}
              className="flex flex-col items-center justify-center px-2 cursor-default"
              onMouseEnter={() => setHoveredStat(stat.key)}
              onMouseLeave={() => setHoveredStat(null)}
            >
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p
                className="text-2xl md:text-[28px] font-bold transition-colors duration-150"
                style={{
                  color: hoveredStat === stat.key ? "hsl(var(--primary))" : "hsl(var(--foreground))",
                }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
