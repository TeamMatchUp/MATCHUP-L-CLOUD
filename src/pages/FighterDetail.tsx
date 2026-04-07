import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/Header";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, ChevronDown, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/hooks/useFollow";
import { toast } from "sonner";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { FlagIcon, getCountryDisplayName } from "@/components/FlagIcon";
import { ProfileCompletionBar } from "@/components/fighter/ProfileCompletionBar";

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

const isKO = (m?: string | null) => { if (!m) return false; const u = m.toUpperCase(); return u === 'KO' || u.startsWith('KO '); };
const isTKO = (m?: string | null) => m?.toUpperCase().includes('TKO') ?? false;
const isSub = (m?: string | null) => m?.toUpperCase().includes('SUB') ?? false;
const isDec = (m?: string | null) => { if (!m) return false; const u = m.toUpperCase(); return u.includes('DECISION') || u.includes('DEC') || u.includes('POINTS'); };
const isWin = (f: any, id: string) => f.result?.toLowerCase() === 'win' || f.winner_id === id;
const isLoss = (f: any) => f.result?.toLowerCase() === 'loss';
const isDraw = (f: any) => f.result?.toLowerCase() === 'draw';

export default function FighterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, activeRole } = useAuth();
  const fromParam = searchParams.get("from");
  const [activeTab, setActiveTab] = useState<"record" | "stats">("record");
  const [fightFilter, setFightFilter] = useState<"all" | "kos" | "subs" | "decs">("all");
  const { track } = useAnalytics();

  useEffect(() => {
    if (id) void track("fighter_profile_viewed", { fighter_id: id, viewed_by_role: activeRole || "anonymous" });
  }, [id]);
  const [expandedFight, setExpandedFight] = useState<string | null>(null);

  const { data: fighter, isLoading } = useQuery({
    queryKey: ["fighter", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fighter_profiles")
        .select("*, fighter_gym_links(gym_id, is_primary, status, gyms(id, name, location))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      let avatarUrl: string | null = null;
      if (data.user_id) {
        const { data: profile } = await supabase.from("profiles").select("avatar_url").eq("id", data.user_id).single();
        avatarUrl = profile?.avatar_url || null;
      }
      return { ...data, _avatar: data.profile_image || avatarUrl || null };
    },
    enabled: !!id,
  });

  const { data: fights = [] } = useQuery({
    queryKey: ["fighter-fights", id],
    queryFn: async () => {
      if (!fighter?.id) return [];
      const { data } = await supabase
        .from("fights")
        .select("id, method, result, winner_id, fighter_a_id, fighter_b_id, opponent_name, event_name, event_date, round, total_rounds")
        .or(`fighter_a_id.eq.${fighter.id},fighter_b_id.eq.${fighter.id}`)
        .order("event_date", { ascending: false });
      return data ?? [];
    },
    enabled: !!fighter?.id,
  });

  const { data: titles = [] } = useQuery({
    queryKey: ["fighter-titles", id],
    queryFn: async () => {
      const { data } = await supabase.from("fighter_titles").select("*").eq("fighter_id", id!).eq("is_current", true).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  const { isFollowing, toggle: toggleFollow, loading: followLoading, followerCount } = useFollow(fighter?.user_id);

  // Stats
  const stats = useMemo(() => {
    if (!fighter) return { wins: 0, losses: 0, draws: 0, kos: 0, tkos: 0, subs: 0, decs: 0, lossKos: 0, lossDecs: 0, lossSubs: 0 };
    const w = fights.filter((f: any) => isWin(f, fighter.id));
    const l = fights.filter((f: any) => isLoss(f));
    const d = fights.filter((f: any) => isDraw(f));
    return {
      wins: w.length, losses: l.length, draws: d.length,
      kos: w.filter((f: any) => isKO(f.method)).length,
      tkos: w.filter((f: any) => isTKO(f.method)).length,
      subs: w.filter((f: any) => isSub(f.method)).length,
      decs: w.filter((f: any) => isDec(f.method)).length,
      lossKos: l.filter((f: any) => isKO(f.method) || isTKO(f.method)).length,
      lossDecs: l.filter((f: any) => isDec(f.method)).length,
      lossSubs: l.filter((f: any) => isSub(f.method)).length,
    };
  }, [fights, fighter]);

  const total = stats.wins + stats.losses + stats.draws;
  const finishRate = stats.wins > 0 ? Math.round(((stats.kos + stats.tkos + stats.subs) / stats.wins) * 100) : 0;

  // Filtered fights for history
  const filteredFights = useMemo(() => {
    if (!fighter) return [];
    return fights.filter((f: any) => {
      if (fightFilter === "all") return true;
      if (!isWin(f, fighter.id)) return false;
      if (fightFilter === "kos") return isKO(f.method) || isTKO(f.method);
      if (fightFilter === "subs") return isSub(f.method);
      if (fightFilter === "decs") return isDec(f.method);
      return true;
    });
  }, [fights, fightFilter, fighter]);

  // Group by year
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredFights.forEach((f: any) => {
      const year = f.event_date ? new Date(f.event_date).getFullYear().toString() : "Unknown";
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(f);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredFights]);

  // Running record computation
  const runningRecords = useMemo(() => {
    if (!fighter) return new Map<string, string>();
    const sorted = [...fights].sort((a: any, b: any) => new Date(a.event_date || 0).getTime() - new Date(b.event_date || 0).getTime());
    const map = new Map<string, string>();
    let rw = 0, rl = 0, rd = 0;
    sorted.forEach((f: any) => {
      if (isWin(f, fighter.id)) rw++;
      else if (isLoss(f)) rl++;
      else rd++;
      map.set(f.id, `${rw}-${rl}${rd > 0 ? `-${rd}` : ""}`);
    });
    return map;
  }, [fights, fighter]);

  // Radar data
  const radarData = useMemo(() => {
    const max = Math.max(stats.kos, stats.tkos, stats.subs, stats.decs, 1);
    return [
      { subject: "Knockouts", value: Math.round((stats.kos / max) * 100) },
      { subject: "TKOs", value: Math.round((stats.tkos / max) * 100) },
      { subject: "Submissions", value: Math.round((stats.subs / max) * 100) },
      { subject: "Decisions", value: Math.round((stats.decs / max) * 100) },
    ];
  }, [stats]);

  if (isLoading) return (
    <div className="min-h-screen" style={{ background: "#080a0d" }}><Header /><main className="pt-16"><div className="container py-16"><div className="h-8 w-64 animate-pulse rounded mb-4" style={{ background: "#111318" }} /></div></main></div>
  );

  if (!fighter) return (
    <div className="min-h-screen" style={{ background: "#080a0d" }}><Header /><main className="pt-16"><div className="container py-16 text-center"><h1 className="font-heading text-3xl mb-4" style={{ color: "#e8eaf0" }}>Fighter Not Found</h1><Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></div></main><Footer /></div>
  );

  const gyms = (fighter.fighter_gym_links ?? []).filter((l: any) => l.status === "approved");
  const primaryGym = gyms.find((l: any) => l.is_primary);
  const gymName = primaryGym?.gyms?.name ?? (gyms[0]?.gyms?.name ?? "Independent");
  const isOwnerOrCoach = user && (fighter.user_id === user.id || fighter.created_by_coach_id === user.id);
  const showFollow = user && fighter.user_id && fighter.user_id !== user.id;
  const initials = fighter.name.split(" ").filter((n: string) => !n.startsWith('"')).map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const handleShare = () => { navigator.clipboard.writeText(window.location.href); toast.success("Profile link copied!"); };

  const displayWins = fights.length > 0 ? stats.wins : fighter.record_wins;
  const displayLosses = fights.length > 0 ? stats.losses : fighter.record_losses;
  const displayDraws = fights.length > 0 ? stats.draws : fighter.record_draws;

  // Method row component
  const MethodRow = ({ label, count, total: t, color }: { label: string; count: number; total: number; color: string }) => {
    const pct = t > 0 ? Math.round((count / t) * 100) : 0;
    return (
      <div className="flex items-center justify-between" style={{ padding: "6px 0" }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 14, fontWeight: 700, color }}>{count}</span>
          <span style={{ fontSize: 12, color: "#8b909e" }}>{label}</span>
        </div>
        <span style={{ fontSize: 12, color: "#8b909e" }}>{pct}%</span>
      </div>
    );
  };

  // Year record
  const yearRecord = (yearFights: any[]) => {
    let w = 0, l = 0;
    yearFights.forEach((f: any) => { if (isWin(f, fighter.id)) w++; else if (isLoss(f)) l++; });
    return `${w}-${l}`;
  };

  return (
    <div className="min-h-screen" style={{ background: "#080a0d" }}>
      <Header />
      <main className="pt-14">
        <div className="container max-w-2xl" style={{ paddingLeft: 0, paddingRight: 0 }}>
          {isOwnerOrCoach && <div style={{ padding: "0 16px" }}><ProfileCompletionBar fighterId={fighter.id} fighterProfile={fighter} /></div>}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* HERO */}
            <div style={{
              position: "relative", height: 200,
              background: "linear-gradient(180deg, rgba(180,30,30,0.35) 0%, rgba(8,10,13,0) 65%)",
            }}>
              {/* Back button */}
              <button onClick={() => fromParam === "roster" ? navigate("/dashboard?section=roster") : navigate(-1)} style={{
                position: "absolute", top: 16, left: 16, zIndex: 5, width: 32, height: 32, borderRadius: "50%",
                background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", border: "none", color: "#e8eaf0",
              }}>
                <ArrowLeft style={{ width: 16, height: 16 }} />
              </button>
              {/* Share */}
              <button onClick={handleShare} style={{
                position: "absolute", top: 16, right: 16, zIndex: 5, width: 32, height: 32, borderRadius: "50%",
                background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", border: "none", color: "#e8eaf0",
              }}>
                <Share2 style={{ width: 16, height: 16 }} />
              </button>
              {/* Follow */}
              {showFollow && (
                <button onClick={toggleFollow} disabled={followLoading} style={{
                  position: "absolute", top: 16, right: 56, zIndex: 5, borderRadius: 20, padding: "6px 16px", fontSize: 12, fontWeight: 600,
                  background: isFollowing ? "rgba(232,160,32,0.15)" : "#e8a020", color: isFollowing ? "#e8a020" : "#080a0d",
                  border: isFollowing ? "1px solid #e8a020" : "none", cursor: "pointer", backdropFilter: "blur(8px)",
                }}>
                  {isFollowing ? "Following" : "Follow"}
                </button>
              )}
              {/* Fighter identity */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 20px 20px", display: "flex", alignItems: "flex-end", gap: 14 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%", border: "2px solid rgba(232,160,32,0.5)",
                  boxShadow: "0 0 20px rgba(232,160,32,0.2)", overflow: "hidden", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: fighter._avatar ? "transparent" : "linear-gradient(135deg, rgba(232,160,32,0.25), rgba(232,160,32,0.08))",
                }}>
                  {fighter._avatar ? (
                    <img src={fighter._avatar} alt={fighter.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "#e8a020" }}>{initials}</span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: "#e8eaf0" }}>{fighter.name}</span>
                  <div className="flex items-center gap-1.5" style={{ fontSize: 13, color: "#8b909e" }}>
                    <FlagIcon countryCode={fighter.country} size={16} />
                    <span>{WEIGHT_CLASS_LABELS[fighter.weight_class] || fighter.weight_class}</span>
                  </div>
                  {titles.length > 0 && (
                    <div className="flex gap-2 flex-wrap" style={{ marginTop: 4 }}>
                      {titles.slice(0, 3).map((t: any) => (
                        <span key={t.id} className="flex items-center gap-1" style={{
                          background: "rgba(232,160,32,0.1)", borderRadius: 9999, padding: "3px 10px", fontSize: 11, fontWeight: 600, color: "#e8a020",
                        }}>
                          <Award style={{ width: 10, height: 10 }} />
                          {t.title}{t.organisation ? ` · ${t.organisation}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* TABS: Record | Stats */}
            <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", margin: "0 16px" }}>
              {(["record", "stats"] as const).map((t) => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", background: "none", border: "none",
                  color: activeTab === t ? "#e8eaf0" : "#555b6b", borderBottom: activeTab === t ? "2px solid #e8eaf0" : "2px solid transparent",
                  textTransform: "capitalize", transition: "all 0.2s",
                }}>
                  {t === "record" ? "Record" : "Stats"}
                </button>
              ))}
            </div>

            {activeTab === "record" && (
              <>
                {/* PRO RECORD SUMMARY CARD */}
                <div style={{
                  margin: "16px 16px 0", background: "#111318", borderRadius: 12, padding: "16px 20px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#8b909e", textTransform: "uppercase", letterSpacing: "0.08em" }}>PRO RECORD SUMMARY</span>
                  <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
                    <span style={{ fontSize: 30, fontWeight: 800, color: "#e8eaf0" }}>{displayWins}-{displayLosses}-{displayDraws}</span>
                    {stats.wins > 0 && (
                      <span style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", borderRadius: 9999, padding: "5px 12px", fontSize: 13, fontWeight: 700 }}>
                        {finishRate}% Finish Rate
                      </span>
                    )}
                  </div>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "12px 0" }} />
                  {/* Two column wins/losses */}
                  <div className="grid grid-cols-2" style={{ gap: 0 }}>
                    <div style={{ paddingRight: 16, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0" }}>Wins</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#22c55e" }}>{displayWins}</span>
                      </div>
                      <MethodRow label="KO/TKO" count={stats.kos + stats.tkos} total={total} color="#22c55e" />
                      <MethodRow label="DEC" count={stats.decs} total={total} color="#22c55e" />
                      <MethodRow label="SUB" count={stats.subs} total={total} color="#22c55e" />
                    </div>
                    <div style={{ paddingLeft: 16 }}>
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0" }}>Losses</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#ef4444" }}>{displayLosses}</span>
                      </div>
                      <MethodRow label="KO/TKO" count={stats.lossKos} total={total} color="#ef4444" />
                      <MethodRow label="DEC" count={stats.lossDecs} total={total} color="#ef4444" />
                      <MethodRow label="SUB" count={stats.lossSubs} total={total} color="#ef4444" />
                    </div>
                  </div>
                </div>

                {/* FILTER PILLS */}
                <div className="flex gap-2" style={{ padding: "14px 16px" }}>
                  {(["all", "kos", "subs", "decs"] as const).map((f) => (
                    <button key={f} onClick={() => setFightFilter(f)} style={{
                      padding: "8px 20px", borderRadius: 9999, fontSize: 13, fontWeight: fightFilter === f ? 700 : 600, cursor: "pointer", border: "none",
                      background: fightFilter === f ? "#e8eaf0" : "#181c24", color: fightFilter === f ? "#080a0d" : "#8b909e", transition: "all 0.2s",
                    }}>
                      {f === "all" ? "All" : f === "kos" ? "KOs" : f === "subs" ? "SUBs" : "DECs"}
                    </button>
                  ))}
                </div>

                {/* FIGHT HISTORY BY YEAR */}
                {filteredFights.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#8b909e", textAlign: "center", padding: "40px 20px" }}>No fight record available</p>
                ) : (
                  grouped.map(([year, yearFights]) => (
                    <div key={year}>
                      <div style={{ padding: "16px 20px 8px" }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#e8eaf0" }}>{year}</span>
                        <span style={{ fontSize: 14, color: "#8b909e", marginLeft: 8 }}>• {yearRecord(yearFights)}</span>
                      </div>
                      {yearFights.map((fight: any) => {
                        const w = isWin(fight, fighter.id);
                        const l = isLoss(fight);
                        const resultLetter = w ? "W" : l ? "L" : "D";
                        const resultColor = w ? "#22c55e" : l ? "#ef4444" : "#f59e0b";
                        const opName = fight.opponent_name ?? "Unknown";
                        const running = runningRecords.get(fight.id) || "";
                        const dateStr = fight.event_date ? new Date(fight.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

                        return (
                          <div key={fight.id} style={{ padding: "12px 20px", boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.04)" }}>
                            <div className="flex gap-3" style={{ alignItems: "flex-start" }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: 6, background: resultColor, flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 13, fontWeight: 700, color: "white",
                              }}>
                                {resultLetter}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span style={{ fontSize: 14, fontWeight: 700, color: "#e8eaf0" }}>{opName}</span>
                                  </div>
                                  <span style={{ fontSize: 12, color: "#8b909e" }}>{fight.event_name || ""}</span>
                                </div>
                                <div className="flex items-center justify-between" style={{ marginTop: 3 }}>
                                  <span style={{ fontSize: 12, color: "#8b909e" }}>{fight.method || "—"}</span>
                                  <span style={{ fontSize: 12, color: "#8b909e" }}>{dateStr}</span>
                                </div>
                                <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                                  {running && (
                                    <span style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                                      {running}
                                    </span>
                                  )}
                                  {fight.round && (
                                    <span style={{ fontSize: 11, color: "#8b909e" }}>R{fight.round}</span>
                                  )}
                                </div>
                              </div>
                              <button onClick={() => setExpandedFight(expandedFight === fight.id ? null : fight.id)} style={{
                                flexShrink: 0, marginTop: 2, background: "none", border: "none", cursor: "pointer", color: "#555b6b",
                                transform: expandedFight === fight.id ? "rotate(180deg)" : "none", transition: "transform 0.2s",
                              }}>
                                <ChevronDown style={{ width: 16, height: 16 }} />
                              </button>
                            </div>
                            {expandedFight === fight.id && (
                              <div style={{ marginTop: 8, paddingLeft: 40, fontSize: 12, color: "#8b909e" }}>
                                {fight.event_name && <p>Event: {fight.event_name}</p>}
                                {fight.method && <p>Method: {fight.method}</p>}
                                {fight.round && <p>Round: {fight.round}{fight.total_rounds ? ` of ${fight.total_rounds}` : ""}</p>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === "stats" && (
              <div style={{ padding: "16px" }}>
                {/* Radar Chart */}
                <div style={{ background: "#111318", borderRadius: 12, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#e8eaf0" }}>Performance Analytics</span>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.06)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#8b909e", fontSize: 11 }} />
                      <Radar name="fighter" dataKey="value" stroke="#e8a020" fill="rgba(232,160,32,0.3)" fillOpacity={1} dot={{ fill: "#e8a020", r: 4 } as any} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                {/* Finish Methods Grid */}
                <div className="grid grid-cols-2 gap-3" style={{ marginTop: 16 }}>
                  {[
                    { label: "Knockouts", value: stats.kos },
                    { label: "TKOs", value: stats.tkos },
                    { label: "Submissions", value: stats.subs },
                    { label: "Decisions", value: stats.decs },
                  ].map((m) => (
                    <div key={m.label} style={{
                      background: "#181c24", borderRadius: 8, padding: 14,
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)",
                    }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: "#e8eaf0" }}>{m.value}</span>
                      <span style={{ fontSize: 11, color: "#8b909e", display: "block" }}>{m.label}</span>
                    </div>
                  ))}
                </div>
                {/* Fighter Info */}
                <div style={{ marginTop: 16, background: "#111318", borderRadius: 12, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#e8eaf0", display: "block", marginBottom: 12 }}>Fighter Information</span>
                  {[
                    { label: "Weight Class", value: WEIGHT_CLASS_LABELS[fighter.weight_class] || fighter.weight_class },
                    { label: "Training Gym", value: gymName },
                    { label: "Nationality", value: getCountryDisplayName(fighter.country) },
                    { label: "Record", value: `${displayWins}-${displayLosses}-${displayDraws}` },
                  ].map((row, i, arr) => (
                    <div key={row.label}>
                      <div className="flex justify-between py-2">
                        <span style={{ fontSize: 12, color: "#8b909e" }}>{row.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0" }}>{row.value}</span>
                      </div>
                      {i < arr.length - 1 && <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />}
                    </div>
                  ))}
                </div>
                {/* Bio */}
                {fighter.bio && (
                  <div style={{ marginTop: 16 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#e8eaf0", display: "block", marginBottom: 8 }}>About</span>
                    <p style={{ color: "#8b909e", lineHeight: 1.6, fontSize: 13 }}>{fighter.bio}</p>
                  </div>
                )}
              </div>
            )}

            {/* Gym affiliations (always visible) */}
            {gyms.length > 0 && (
              <div style={{ padding: "16px", marginTop: 8 }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, fontWeight: 700, color: "#e8eaf0", display: "block", marginBottom: 12 }}>GYM AFFILIATIONS</span>
                <div className="space-y-2">
                  {gyms.map((link: any) => (
                    <Link key={link.gym_id} to={`/gyms/${link.gyms?.id}`} className="flex items-center justify-between" style={{
                      borderRadius: 8, background: "#181c24", padding: "10px 14px", transition: "all 0.2s",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)",
                    }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0" }}>{link.gyms?.name}</p>
                        {link.gyms?.location && <p style={{ fontSize: 12, color: "#8b909e", marginTop: 2 }}>{link.gyms.location}</p>}
                      </div>
                      {link.is_primary && <span style={{ fontSize: 12, fontWeight: 500, color: "#e8a020" }}>Primary</span>}
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
