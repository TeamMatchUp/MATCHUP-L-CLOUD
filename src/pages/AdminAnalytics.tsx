import { Component, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";
import {
  Users, UserCheck, Send, TrendingUp, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, subDays, startOfDay } from "date-fns";

// ── Error Boundary ──
class AdminErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: any }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({ errorInfo });
    console.error("AdminAnalytics error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: "#e8eaf0", background: "#080a0d", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
          <h2 style={{ color: "#ef4444", fontFamily: "Bebas Neue, sans-serif", fontSize: 28 }}>Admin page error</h2>
          <pre style={{ color: "#8b909e", fontSize: 12, whiteSpace: "pre-wrap", marginTop: 16 }}>
            {this.state.error?.toString()}
            {this.state.errorInfo?.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Safe query wrapper ──
async function safeQuery<T>(queryFn: () => Promise<{ data: T | null; error: any }>): Promise<T> {
  try {
    const { data, error } = await queryFn();
    if (error) { console.error("Supabase query error:", error); return [] as any; }
    return data ?? ([] as any);
  } catch (e) {
    console.error("Supabase query catch:", e);
    return [] as any;
  }
}

const todayStart = () => startOfDay(new Date()).toISOString();

// ── KPI Card ──
function KpiCard({ title, value, icon: Icon }: {
  title: string; value: string | number; icon: React.ElementType;
}) {
  return (
    <Card className="bg-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-[Inter]">{title}</span>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <p className="text-3xl font-bold font-['Bebas_Neue'] tracking-wide text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

// ── Main wrapper with mounted guard ──
export default function AdminAnalytics() {
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!mounted) return;
        if (user?.app_metadata?.role !== "admin") {
          navigate("/dashboard");
          return;
        }
        setIsAdmin(true);
      } catch (e) {
        console.error("Admin init error:", e);
        if (mounted) navigate("/dashboard");
      } finally {
        if (mounted) setReady(true);
      }
    };
    init();
    return () => { mounted = false; };
  }, [navigate]);

  if (!ready) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#8b909e", fontFamily: "Inter, sans-serif", fontSize: 14, background: "#080a0d" }}>
        Checking access...
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <AdminErrorBoundary>
      <AdminAnalyticsDashboard />
    </AdminErrorBoundary>
  );
}

// ── Dashboard (only mounts after admin confirmed) ──
function AdminAnalyticsDashboard() {
  // ROW 1: KPIs
  const { data: kpis } = useQuery({
    queryKey: ["admin-analytics-kpis"],
    queryFn: async () => {
      const today = todayStart();
      const [activeUsers, onboardingToday, proposalsSent, accepted, declined] = await Promise.all([
        safeQuery(() => supabase.from("analytics_events" as any).select("user_id").gte("created_at", today)),
        safeQuery(() => supabase.from("analytics_events" as any).select("id", { count: "exact", head: true }).eq("event_type", "onboarding_completed").gte("created_at", today)),
        safeQuery(() => supabase.from("analytics_events" as any).select("id", { count: "exact", head: true }).eq("event_type", "proposal_sent")),
        safeQuery(() => supabase.from("analytics_events" as any).select("id", { count: "exact", head: true }).eq("event_type", "proposal_accepted")),
        safeQuery(() => supabase.from("analytics_events" as any).select("id", { count: "exact", head: true }).eq("event_type", "proposal_declined")),
      ]);
      const uniqueUsers = new Set((activeUsers as any[] || []).map((e: any) => e.user_id).filter(Boolean)).size;
      const acc = (accepted as any)?.count ?? 0;
      const dec = (declined as any)?.count ?? 0;
      const rate = acc + dec > 0 ? Math.round((acc / (acc + dec)) * 100) : 0;
      return {
        activeUsersToday: uniqueUsers,
        onboardingToday: (onboardingToday as any)?.count ?? 0,
        proposalsSent: (proposalsSent as any)?.count ?? 0,
        acceptanceRate: rate,
      };
    },
    refetchInterval: 30_000,
  });

  // ROW 2: Funnel
  const { data: funnelData = [] } = useQuery({
    queryKey: ["admin-analytics-funnel"],
    queryFn: async () => {
      const data = await safeQuery(() => supabase.from("analytics_events" as any).select("event_data").eq("event_type", "onboarding_step_completed"));
      if (!data || (data as any[]).length === 0) return [];
      const buckets: Record<string, Record<string, number>> = {};
      (data as any[]).forEach((row: any) => {
        const d = typeof row.event_data === "string" ? JSON.parse(row.event_data) : row.event_data;
        const step = d?.step ?? 0;
        const role = d?.role ?? "unknown";
        const key = `Step ${step}`;
        if (!buckets[key]) buckets[key] = {};
        buckets[key][role] = (buckets[key][role] || 0) + 1;
      });
      return Object.entries(buckets)
        .map(([step, roles]) => ({ step, fighter: roles.fighter || 0, coach: roles.coach || 0, organiser: roles.organiser || 0 }))
        .sort((a, b) => parseInt(a.step.replace("Step ", "")) - parseInt(b.step.replace("Step ", "")));
    },
  });

  // ROW 3: Explore
  const { data: exploreData } = useQuery({
    queryKey: ["admin-analytics-explore"],
    queryFn: async () => {
      const [views, clicks, profileViews] = await Promise.all([
        safeQuery(() => supabase.from("analytics_events" as any).select("event_data").eq("event_type", "explore_page_viewed")),
        safeQuery(() => supabase.from("analytics_events" as any).select("event_data").eq("event_type", "fighter_card_clicked")),
        safeQuery(() => supabase.from("analytics_events" as any).select("event_data").eq("event_type", "fighter_profile_viewed")),
      ]);
      const cats: Record<string, number> = { gyms: 0, events: 0, fighters: 0 };
      ((views as any[]) || []).forEach((r: any) => {
        const d = typeof r.event_data === "string" ? JSON.parse(r.event_data) : r.event_data;
        const c = d?.category;
        if (c && cats[c] !== undefined) cats[c]++;
      });
      const fighterViews = cats.fighters || 0;
      const fighterClicks = ((clicks as any[]) || []).length;
      const ctr = fighterViews > 0 ? Math.round((fighterClicks / fighterViews) * 100) : 0;
      const profileCounts: Record<string, number> = {};
      ((profileViews as any[]) || []).forEach((r: any) => {
        const d = typeof r.event_data === "string" ? JSON.parse(r.event_data) : r.event_data;
        const fid = d?.fighter_id;
        if (fid) profileCounts[fid] = (profileCounts[fid] || 0) + 1;
      });
      const topProfiles = Object.entries(profileCounts)
        .sort(([, a], [, b]) => b - a).slice(0, 10)
        .map(([id, count]) => ({ id, count }));
      return { categories: Object.entries(cats).map(([name, count]) => ({ name, count })), fighterCTR: ctr, topProfiles };
    },
  });

  // ROW 4: Pipeline
  const { data: pipelineData } = useQuery({
    queryKey: ["admin-analytics-pipeline"],
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const [sent, accepted, declined] = await Promise.all([
        safeQuery(() => supabase.from("analytics_events" as any).select("created_at").eq("event_type", "proposal_sent").gte("created_at", since)),
        safeQuery(() => supabase.from("analytics_events" as any).select("created_at").eq("event_type", "proposal_accepted").gte("created_at", since)),
        safeQuery(() => supabase.from("analytics_events" as any).select("created_at").eq("event_type", "proposal_declined").gte("created_at", since)),
      ]);
      const dailyCounts: Record<string, { sent: number; accepted: number; declined: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "MMM dd");
        dailyCounts[d] = { sent: 0, accepted: 0, declined: 0 };
      }
      ((sent as any[]) || []).forEach((r: any) => { const d = format(new Date(r.created_at), "MMM dd"); if (dailyCounts[d]) dailyCounts[d].sent++; });
      ((accepted as any[]) || []).forEach((r: any) => { const d = format(new Date(r.created_at), "MMM dd"); if (dailyCounts[d]) dailyCounts[d].accepted++; });
      ((declined as any[]) || []).forEach((r: any) => { const d = format(new Date(r.created_at), "MMM dd"); if (dailyCounts[d]) dailyCounts[d].declined++; });
      const daily = Object.entries(dailyCounts).map(([date, v]) => ({
        date, sent: v.sent, accepted: v.accepted, declined: v.declined,
        rate: v.accepted + v.declined > 0 ? Math.round((v.accepted / (v.accepted + v.declined)) * 100) : 0,
      }));
      const allSent = (sent as any[]) || [];
      const allResponses = [...((accepted as any[]) || []), ...((declined as any[]) || [])];
      let totalHours = 0, responseCount = 0;
      allResponses.forEach((r: any) => {
        const responseTime = new Date(r.created_at).getTime();
        const closest = allSent.map((s: any) => new Date(s.created_at).getTime()).filter((t: number) => t <= responseTime).sort((a: number, b: number) => b - a)[0];
        if (closest) { totalHours += (responseTime - closest) / (1000 * 60 * 60); responseCount++; }
      });
      return { daily, avgResponseHours: responseCount > 0 ? Math.round(totalHours / responseCount) : 0 };
    },
  });

  // ROW 5: Retention
  const { data: retentionData } = useQuery({
    queryKey: ["admin-analytics-retention"],
    queryFn: async () => {
      const data = await safeQuery(() => supabase.from("analytics_events" as any).select("user_id, created_at, event_data").eq("event_type", "session_started"));
      if (!data || (data as any[]).length === 0) return { day1: {} as Record<string, number>, day7: {} as Record<string, number> };
      const userDays: Record<string, Set<string>> = {};
      const userRoles: Record<string, string> = {};
      (data as any[]).forEach((r: any) => {
        const uid = r.user_id; if (!uid) return;
        const day = format(new Date(r.created_at), "yyyy-MM-dd");
        if (!userDays[uid]) userDays[uid] = new Set();
        userDays[uid].add(day);
        const d = typeof r.event_data === "string" ? JSON.parse(r.event_data) : r.event_data;
        if (d?.role) userRoles[uid] = d.role;
      });
      const roles = ["fighter", "coach", "organiser"];
      const result: Record<string, Record<string, number>> = { day1: {}, day7: {} };
      roles.forEach((role) => {
        const usersOfRole = Object.entries(userRoles).filter(([, r]) => r === role).map(([uid]) => uid);
        if (usersOfRole.length === 0) { result.day1[role] = 0; result.day7[role] = 0; return; }
        let d1Return = 0, d7Return = 0;
        usersOfRole.forEach((uid) => {
          const days = Array.from(userDays[uid] || []).sort();
          if (days.length < 2) return;
          const firstDay = new Date(days[0]);
          const day1 = format(subDays(firstDay, -1), "yyyy-MM-dd");
          const day7 = format(subDays(firstDay, -7), "yyyy-MM-dd");
          if (userDays[uid].has(day1)) d1Return++;
          if (userDays[uid].has(day7)) d7Return++;
        });
        result.day1[role] = Math.round((d1Return / usersOfRole.length) * 100);
        result.day7[role] = Math.round((d7Return / usersOfRole.length) * 100);
      });
      return result;
    },
  });

  // Fighter names for top profiles
  const topProfileIds = exploreData?.topProfiles?.map((p) => p.id) || [];
  const { data: fighterNames } = useQuery({
    queryKey: ["admin-fighter-names", topProfileIds],
    queryFn: async () => {
      if (topProfileIds.length === 0) return {};
      const data = await safeQuery(() => supabase.from("fighter_profiles").select("id, name").in("id", topProfileIds));
      const map: Record<string, string> = {};
      ((data as any[]) || []).forEach((f: any) => { map[f.id] = f.name; });
      return map;
    },
    enabled: topProfileIds.length > 0,
  });

  const funnelConfig = {
    fighter: { label: "Fighter", color: "hsl(var(--primary))" },
    coach: { label: "Coach", color: "hsl(142, 71%, 45%)" },
    organiser: { label: "Organiser", color: "hsl(217, 91%, 60%)" },
  };
  const pipelineConfig = {
    sent: { label: "Sent", color: "hsl(var(--primary))" },
    accepted: { label: "Accepted", color: "hsl(142, 71%, 45%)" },
    declined: { label: "Declined", color: "hsl(0, 84%, 60%)" },
  };
  const categoryConfig = { count: { label: "Views", color: "hsl(var(--primary))" } };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-3xl font-['Bebas_Neue'] tracking-wide text-foreground">Platform Analytics</h1>
        </div>

        {/* ROW 1 — KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard title="Active Users Today" value={kpis?.activeUsersToday ?? 0} icon={Users} />
          <KpiCard title="Onboarding Today" value={kpis?.onboardingToday ?? 0} icon={UserCheck} />
          <KpiCard title="Proposals Sent (All)" value={kpis?.proposalsSent ?? 0} icon={Send} />
          <KpiCard title="Acceptance Rate" value={`${kpis?.acceptanceRate ?? 0}%`} icon={TrendingUp} />
        </div>

        {/* ROW 2 — Onboarding Funnel */}
        <Card className="mb-8">
          <CardHeader><CardTitle className="font-['Bebas_Neue'] tracking-wide text-lg">Onboarding Funnel by Role</CardTitle></CardHeader>
          <CardContent>
            {(funnelData?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No onboarding data yet. Events will appear as users go through onboarding.</p>
            ) : (
              <ChartContainer config={funnelConfig} className="h-[300px] w-full">
                <BarChart data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="step" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="fighter" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="coach" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="organiser" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* ROW 3 — Explore Engagement */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader><CardTitle className="font-['Bebas_Neue'] tracking-wide text-lg">Category Views</CardTitle></CardHeader>
            <CardContent>
              {(exploreData?.categories?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No explore views yet.</p>
              ) : (
                <ChartContainer config={categoryConfig} className="h-[200px] w-full">
                  <BarChart data={exploreData?.categories}>
                    <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-['Bebas_Neue'] tracking-wide text-lg">Fighter CTR</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-[200px]">
              <p className="text-5xl font-['Bebas_Neue'] text-primary">{exploreData?.fighterCTR ?? 0}%</p>
              <p className="text-xs text-muted-foreground mt-2">Card clicks / explore views</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-['Bebas_Neue'] tracking-wide text-lg">Top Viewed Fighters</CardTitle></CardHeader>
            <CardContent className="max-h-[200px] overflow-y-auto">
              {(exploreData?.topProfiles?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No profile views yet.</p>
              ) : (
                <div className="space-y-2">
                  {exploreData?.topProfiles?.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{i + 1}. {fighterNames?.[p.id] || p.id.slice(0, 8)}</span>
                      <span className="font-medium text-foreground">{p.count} views</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ROW 4 — Proposal Pipeline */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-['Bebas_Neue'] tracking-wide text-lg">Proposal Pipeline — Last 30 Days</CardTitle>
              <span className="text-xs text-muted-foreground">Avg response: {pipelineData?.avgResponseHours ?? 0}h</span>
            </div>
          </CardHeader>
          <CardContent>
            {(pipelineData?.daily?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No proposal data yet.</p>
            ) : (
              <ChartContainer config={pipelineConfig} className="h-[300px] w-full">
                <LineChart data={pipelineData?.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="sent" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="accepted" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="declined" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* ROW 5 — Retention */}
        <Card className="mb-8">
          <CardHeader><CardTitle className="font-['Bebas_Neue'] tracking-wide text-lg">Retention by Role</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {["fighter", "coach", "organiser"].map((role) => (
                <div key={role} className="text-center p-4 rounded-lg bg-raised">
                  <p className="text-xs uppercase text-muted-foreground tracking-wider mb-3 font-[Inter]">{role}</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-2xl font-['Bebas_Neue'] text-foreground">{retentionData?.day1?.[role] ?? 0}%</p>
                      <p className="text-[10px] text-muted-foreground">Day 1 Return</p>
                    </div>
                    <div>
                      <p className="text-2xl font-['Bebas_Neue'] text-foreground">{retentionData?.day7?.[role] ?? 0}%</p>
                      <p className="text-[10px] text-muted-foreground">Day 7 Return</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
