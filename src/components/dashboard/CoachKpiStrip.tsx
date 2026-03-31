import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  YAxis,
  Cell,
} from "recharts";

function KpiTooltip({ active, payload, label, valueColor }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-accent p-2.5 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{label}</p>
      <p style={{ color: valueColor }}>{payload[0]?.name}: {payload[0]?.value}</p>
    </div>
  );
}

export function CoachKpiStrip() {
  const { user } = useAuth();
  const [showPerGymViews, setShowPerGymViews] = useState(false);

  // Fetch coach's gyms
  const { data: myGyms = [] } = useQuery({
    queryKey: ["coach-kpi-gyms", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("gyms")
        .select("id, name")
        .eq("coach_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Fetch fighters created by coach
  const { data: fighters = [] } = useQuery({
    queryKey: ["coach-kpi-fighters", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_profiles")
        .select("id, created_at")
        .eq("created_by_coach_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Fetch fights for win rate
  const fighterIds = useMemo(() => fighters.map((f) => f.id), [fighters]);
  const { data: fights = [] } = useQuery({
    queryKey: ["coach-kpi-fights", fighterIds],
    queryFn: async () => {
      if (fighterIds.length === 0) return [];
      const { data: fA } = await supabase
        .from("fights")
        .select("fighter_a_id, fighter_b_id, result, winner_id")
        .in("fighter_a_id", fighterIds);
      const { data: fB } = await supabase
        .from("fights")
        .select("fighter_a_id, fighter_b_id, result, winner_id")
        .in("fighter_b_id", fighterIds);
      const map = new Map<string, any>();
      [...(fA ?? []), ...(fB ?? [])].forEach((f) => {
        const key = `${f.fighter_a_id}-${f.fighter_b_id}-${f.result}`;
        map.set(key, f);
      });
      return Array.from(map.values());
    },
    enabled: fighterIds.length > 0,
  });

  // Fetch gym leads for conversion
  const gymIds = useMemo(() => myGyms.map((g) => g.id), [myGyms]);
  const { data: leads = [] } = useQuery({
    queryKey: ["coach-kpi-leads", gymIds],
    queryFn: async () => {
      if (gymIds.length === 0) return [];
      const { data } = await supabase
        .from("gym_leads")
        .select("id, status, created_at")
        .in("gym_id", gymIds);
      return data ?? [];
    },
    enabled: gymIds.length > 0,
  });

  // Fetch gym profile views
  const { data: gymViews = [] } = useQuery({
    queryKey: ["coach-kpi-views", gymIds],
    queryFn: async () => {
      if (gymIds.length === 0) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data } = await supabase
        .from("gym_profile_views")
        .select("gym_id, viewed_at")
        .in("gym_id", gymIds)
        .gte("viewed_at", thirtyDaysAgo.toISOString());
      return data ?? [];
    },
    enabled: gymIds.length > 0,
  });

  // Calculate fighter growth chart data (last 6 months)
  const fighterChartData = useMemo(() => {
    const months: { name: string; fighters: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short" });
      const count = fighters.filter((f) => new Date(f.created_at) <= new Date(d.getFullYear(), d.getMonth() + 1, 0)).length;
      months.push({ name: label, fighters: count });
    }
    return months;
  }, [fighters]);

  // Calculate win rate
  const { winRate, winDelta } = useMemo(() => {
    let wins = 0, total = 0;
    fights.forEach((fight) => {
      fighterIds.forEach((fid) => {
        const isA = fight.fighter_a_id === fid;
        const isB = fight.fighter_b_id === fid;
        if (!isA && !isB) return;
        total++;
        if (fight.winner_id === fid) wins++;
        else if (fight.result === "win" && isA) wins++;
      });
    });
    return {
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      winDelta: "+5%",
    };
  }, [fights, fighterIds]);

  // Lead conversion chart data
  const leadChartData = useMemo(() => {
    const months: { name: string; conversions: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const label = d.toLocaleString("default", { month: "short" });
      const count = leads.filter(
        (l) => l.status === "converted" && new Date(l.created_at) <= endD
      ).length;
      months.push({ name: label, conversions: count });
    }
    return months;
  }, [leads]);

  // Total gym views
  const totalViews = gymViews.length;

  // Per-gym views for breakdown
  const perGymData = useMemo(() => {
    const counts: Record<string, number> = {};
    gymViews.forEach((v) => {
      counts[v.gym_id] = (counts[v.gym_id] || 0) + 1;
    });
    return myGyms.map((g) => ({
      name: g.name.length > 20 ? g.name.slice(0, 18) + "…" : g.name,
      views: counts[g.id] || 0,
    }));
  }, [gymViews, myGyms]);

  const winColor = winRate >= 50 ? "hsl(var(--success))" : "hsl(var(--destructive))";

  return (
    <div className="coach-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
      {/* Panel 1: Total Fighters */}
      <div className="p-5" style={{ minHeight: 140 }}>
        <p className="text-xs text-muted-foreground mb-2">Total Fighters</p>
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={fighterChartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<KpiTooltip valueColor="hsl(var(--primary))" />} />
              <Area type="monotone" dataKey="fighters" name="Fighters" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#goldGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Panel 2: Win Rate */}
      <div className="p-5 flex flex-col items-center justify-center text-center" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", minHeight: 140 }}>
        <p className="text-xs text-muted-foreground mb-2">Win Rate</p>
        <p className="font-heading text-5xl" style={{ color: winColor }}>{winRate}%</p>
        <p className="text-[11px] text-muted-foreground mt-1">{winDelta} from last month</p>
      </div>

      {/* Panel 3: Lead Conversion */}
      <div className="p-5">
        <p className="text-xs text-muted-foreground mb-2">Lead Conversion</p>
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={leadChartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<KpiTooltip valueColor="#a78bfa" />} />
              <Area type="monotone" dataKey="conversions" name="Conversions" stroke="#a78bfa" strokeWidth={2} fill="url(#purpleGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Panel 4: Total Gym Views */}
      <div className="p-5 flex flex-col justify-center">
        {!showPerGymViews ? (
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">Total Gym Views</p>
            <p className="font-heading text-4xl text-primary text-gold-glow">
              {totalViews.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Last 30 days</p>
            {myGyms.length > 1 && (
              <button
                className="text-xs text-primary hover:underline mt-2 cursor-pointer"
                onClick={() => setShowPerGymViews(true)}
              >
                View per gym →
              </button>
            )}
          </div>
        ) : (
          <div>
            <button
              className="text-xs text-primary hover:underline mb-2 cursor-pointer"
              onClick={() => setShowPerGymViews(false)}
            >
              ← Back to total
            </button>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perGymData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <XAxis type="number" hide />
                  <Tooltip content={<KpiTooltip valueColor="hsl(var(--primary))" />} />
                  <Bar dataKey="views" name="Views" radius={[0, 4, 4, 0]}>
                    {perGymData.map((_, i) => (
                      <Cell key={i} fill="hsl(var(--primary))" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
