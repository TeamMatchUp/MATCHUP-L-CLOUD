import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, ChevronDown, Award, Instagram, Twitter, Youtube, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/hooks/useFollow";
import { toast } from "sonner";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { FlagIcon, getCountryDisplayName } from "@/components/FlagIcon";
import { ProfileCompletionBar } from "@/components/fighter/ProfileCompletionBar";

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

const GOLD = "hsl(var(--primary))";
const GOLD_TINT = "rgba(232,160,32,0.12)";
const GOLD_TINT_STRONG = "rgba(232,160,32,0.2)";
const BG = "hsl(var(--background))";
const SURFACE = "hsl(var(--card))";
const INSET = "hsl(var(--muted))";
const TEXT = "hsl(var(--foreground))";
const MUTED = "hsl(var(--muted-foreground))";
const DIM = "hsl(var(--muted-foreground))";
const GREEN = "hsl(var(--success))";
const RED = "hsl(var(--primary))";
const CARD_SHADOW = "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)";
const INSET_SHADOW = "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)";

const isKO = (m?: string | null) => { if (!m) return false; const u = m.toUpperCase(); return u === 'KO' || u.startsWith('KO '); };
const isTKO = (m?: string | null) => m?.toUpperCase().includes('TKO') ?? false;
const isSub = (m?: string | null) => m?.toUpperCase().includes('SUB') ?? false;
const isDec = (m?: string | null) => { if (!m) return false; const u = m.toUpperCase(); return u.includes('DECISION') || u.includes('DEC') || u.includes('POINTS'); };
const isWin = (f: any, id: string) => f.result?.toLowerCase() === 'win' || f.winner_id === id;
const isLoss = (f: any) => f.result?.toLowerCase() === 'loss';
const isDraw = (f: any) => f.result?.toLowerCase() === 'draw';

const formatHeight = (cm?: number | null) => {
  if (!cm) return "—";
  const totalIn = Math.round(cm / 2.54);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn % 12;
  return `${ft}'${inch}"`;
};
const formatReach = (cm?: number | null) => cm ? `${Math.round(cm / 2.54)}"` : "—";
const computeAge = (dob?: string | null) => {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
};

type AnalyticsTab = "overview" | "striking" | "activity" | "radar";
type ScopeTab = "total" | "pro" | "amateur";

export default function FighterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, activeRole } = useAuth();
  const fromParam = searchParams.get("from");
  const [scope, setScope] = useState<ScopeTab>("total");
  const [analyticsTab, setAnalyticsTab] = useState<AnalyticsTab>("overview");
  const [fightFilter, setFightFilter] = useState<"all" | "kos" | "subs" | "decs">("all");
  const [expandedFight, setExpandedFight] = useState<string | null>(null);
  const { track } = useAnalytics();

  useEffect(() => {
    if (id) void track("fighter_profile_viewed", { fighter_id: id, viewed_by_role: activeRole || "anonymous" });
  }, [id]);

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
        .select("id, method, result, winner_id, fighter_a_id, fighter_b_id, opponent_name, event_name, event_date, round, total_rounds, is_amateur")
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

  const { data: related = [] } = useQuery({
    queryKey: ["related-fighters", id, fighter?.weight_class],
    queryFn: async () => {
      if (!fighter) return [];
      const { data } = await supabase
        .from("fighter_profiles")
        .select("id, name, profile_image, weight_class, discipline, country, record_wins, record_losses, record_draws")
        .eq("weight_class", fighter.weight_class)
        .neq("id", fighter.id)
        .eq("visibility", "public")
        .limit(4);
      return data ?? [];
    },
    enabled: !!fighter,
  });

  const { isFollowing, toggle: toggleFollow, loading: followLoading } = useFollow(fighter?.user_id);

  const scopedFights = useMemo(() => {
    if (scope === "total") return fights;
    if (scope === "pro") return fights.filter((f: any) => !f.is_amateur);
    return fights.filter((f: any) => f.is_amateur);
  }, [fights, scope]);

  const stats = useMemo(() => {
    if (!fighter) return { wins: 0, losses: 0, draws: 0, kos: 0, tkos: 0, subs: 0, decs: 0, lossKos: 0, lossTkos: 0, lossDecs: 0, lossSubs: 0, stated: false, avgFinishRound: 0 };
    const w = scopedFights.filter((f: any) => isWin(f, fighter.id));
    const l = scopedFights.filter((f: any) => isLoss(f));
    const d = scopedFights.filter((f: any) => isDraw(f));
    const hasFights = scopedFights.length > 0;
    const cachedW = scope === "amateur" ? (fighter.amateur_wins ?? 0) : scope === "pro" ? (fighter.record_wins ?? 0) : (fighter.record_wins ?? 0) + (fighter.amateur_wins ?? 0);
    const cachedL = scope === "amateur" ? (fighter.amateur_losses ?? 0) : scope === "pro" ? (fighter.record_losses ?? 0) : (fighter.record_losses ?? 0) + (fighter.amateur_losses ?? 0);
    const cachedD = scope === "amateur" ? (fighter.amateur_draws ?? 0) : scope === "pro" ? (fighter.record_draws ?? 0) : (fighter.record_draws ?? 0) + (fighter.amateur_draws ?? 0);
    const finishes = w.filter((f: any) => isKO(f.method) || isTKO(f.method) || isSub(f.method));
    const finishRounds = finishes.map((f: any) => f.round).filter(Boolean);
    return {
      wins: hasFights ? w.length : cachedW,
      losses: hasFights ? l.length : cachedL,
      draws: hasFights ? d.length : cachedD,
      kos: w.filter((f: any) => isKO(f.method)).length,
      tkos: w.filter((f: any) => isTKO(f.method)).length,
      subs: w.filter((f: any) => isSub(f.method)).length,
      decs: w.filter((f: any) => isDec(f.method)).length,
      lossKos: l.filter((f: any) => isKO(f.method)).length,
      lossTkos: l.filter((f: any) => isTKO(f.method)).length,
      lossDecs: l.filter((f: any) => isDec(f.method)).length,
      lossSubs: l.filter((f: any) => isSub(f.method)).length,
      stated: !hasFights,
      avgFinishRound: finishRounds.length ? finishRounds.reduce((a: number, b: number) => a + b, 0) / finishRounds.length : 0,
    };
  }, [scopedFights, fighter, scope]);

  const total = stats.wins + stats.losses + stats.draws;
  const winRate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;
  const finishRate = stats.wins > 0 ? Math.round(((stats.kos + stats.tkos + stats.subs) / stats.wins) * 100) : 0;
  const decisionRate = stats.wins > 0 ? Math.round((stats.decs / stats.wins) * 100) : 0;
  const koRate = (stats.kos + stats.tkos) > 0 ? 100 : 0;

  const filteredFights = useMemo(() => {
    if (!fighter) return [];
    return scopedFights.filter((f: any) => {
      if (fightFilter === "all") return true;
      if (!isWin(f, fighter.id)) return false;
      if (fightFilter === "kos") return isKO(f.method) || isTKO(f.method);
      if (fightFilter === "subs") return isSub(f.method);
      if (fightFilter === "decs") return isDec(f.method);
      return true;
    });
  }, [scopedFights, fightFilter, fighter]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredFights.forEach((f: any) => {
      const year = f.event_date ? new Date(f.event_date).getFullYear().toString() : "Unknown";
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(f);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredFights]);

  const runningRecords = useMemo(() => {
    if (!fighter) return new Map<string, string>();
    const sorted = [...scopedFights].sort((a: any, b: any) => new Date(a.event_date || 0).getTime() - new Date(b.event_date || 0).getTime());
    const map = new Map<string, string>();
    let rw = 0, rl = 0, rd = 0;
    sorted.forEach((f: any) => {
      if (isWin(f, fighter.id)) rw++;
      else if (isLoss(f)) rl++;
      else rd++;
      map.set(f.id, `${rw}-${rl}${rd > 0 ? `-${rd}` : ""}`);
    });
    return map;
  }, [scopedFights, fighter]);

  const last8 = useMemo(() => {
    if (!fighter) return [];
    return scopedFights.slice(0, 8).map((f: any) => isWin(f, fighter.id) ? "W" : isLoss(f) ? "L" : "D").reverse();
  }, [scopedFights, fighter]);

  const fightsPerYear = useMemo(() => {
    const m = new Map<string, number>();
    scopedFights.forEach((f: any) => {
      if (!f.event_date) return;
      const y = new Date(f.event_date).getFullYear().toString().slice(2);
      m.set(y, (m.get(y) ?? 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([year, count]) => ({ year, count }));
  }, [scopedFights]);

  const promotionRecord = useMemo(() => {
    if (!fighter) return [];
    const m = new Map<string, { w: number; l: number; d: number }>();
    scopedFights.forEach((f: any) => {
      const promo = (f.event_name || "Other").split(/[\d:]/)[0].trim() || "Other";
      if (!m.has(promo)) m.set(promo, { w: 0, l: 0, d: 0 });
      const r = m.get(promo)!;
      if (isWin(f, fighter.id)) r.w++;
      else if (isLoss(f)) r.l++;
      else r.d++;
    });
    return Array.from(m.entries()).slice(0, 4);
  }, [scopedFights, fighter]);

  const radarData = useMemo(() => {
    const max = Math.max(stats.kos, stats.tkos, stats.subs, stats.decs, 1);
    return [
      { subject: "KOs", value: Math.round((stats.kos / max) * 100) },
      { subject: "TKOs", value: Math.round((stats.tkos / max) * 100) },
      { subject: "Decisions", value: Math.round((stats.decs / max) * 100) },
      { subject: "Win %", value: winRate },
    ];
  }, [stats, winRate]);

  if (isLoading) return (
    <div className="min-h-screen" style={{ background: BG }}><Header /><main className="pt-16"><div className="container py-6 md:py-10"><div className="h-8 w-64 animate-pulse rounded mb-4" style={{ background: SURFACE }} /></div></main></div>
  );

  if (!fighter) return (
    <div className="min-h-screen" style={{ background: BG }}><Header /><main className="pt-16"><div className="container py-6 md:py-10 text-center"><h1 className="font-heading text-3xl mb-4" style={{ color: TEXT }}>Fighter Not Found</h1><Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></div></main><Footer /></div>
  );

  const gyms = (fighter.fighter_gym_links ?? []).filter((l: any) => l.status === "approved");
  const primaryGym = gyms.find((l: any) => l.is_primary);
  const gymName = primaryGym?.gyms?.name ?? (gyms[0]?.gyms?.name ?? "Independent");
  const isOwnerOrCoach = user && (fighter.user_id === user.id || fighter.created_by_coach_id === user.id);
  const showFollow = user && fighter.user_id && fighter.user_id !== user.id;

  // Parse nickname from name if wrapped in quotes
  const nameParts = fighter.name.match(/"([^"]+)"/);
  const nickname = nameParts ? nameParts[1] : null;
  const cleanName = fighter.name.replace(/"[^"]+"/g, "").replace(/\s+/g, " ").trim();
  const initials = cleanName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const age = computeAge(fighter.date_of_birth);

  const handleShare = () => { navigator.clipboard.writeText(window.location.href); toast.success("Profile link copied!"); };

  // Constellation background — subtle pattern for hero
  const constellationBg = `radial-gradient(circle at 20% 30%, rgba(232,160,32,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(232,160,32,0.03) 0%, transparent 50%), ${SURFACE}`;

  // ──── KPI Card ────
  const KpiCard = ({ value, label, color = TEXT }: { value: React.ReactNode; label: string; color?: string }) => (
    <div style={{ background: SURFACE, borderRadius: 12, padding: "20px 16px", textAlign: "center", boxShadow: CARD_SHADOW }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, lineHeight: 1, letterSpacing: "0.02em", color }}>{value}</div>
      <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: MUTED, textTransform: "uppercase" }}>{label}</div>
    </div>
  );

  // ──── Stat pill (hero) ────
  const StatPill = ({ value, label, color = TEXT, bg = INSET }: { value: React.ReactNode; label: string; color?: string; bg?: string }) => (
    <div style={{ background: bg, borderRadius: 10, padding: "10px 14px", minWidth: 64, textAlign: "center", boxShadow: INSET_SHADOW }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, lineHeight: 1, color }}>{value}</div>
      <div style={{ marginTop: 2, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: MUTED, textTransform: "uppercase" }}>{label}</div>
    </div>
  );

  // ──── Method bar row ────
  const MethodBar = ({ label, count, max, color }: { label: string; count: number; max: number; color: string }) => {
    const pct = max > 0 ? Math.round((count / max) * 100) : 0;
    return (
      <div style={{ marginTop: 10 }}>
        <div className="flex items-center justify-between" style={{ fontSize: 11, marginBottom: 4 }}>
          <span style={{ color: MUTED, fontWeight: 600, letterSpacing: "0.04em" }}>{label}</span>
          <span style={{ color: MUTED }}>{count} · {pct}%</span>
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.3s" }} />
        </div>
      </div>
    );
  };

  const yearRecord = (yearFights: any[]) => {
    let w = 0, l = 0;
    yearFights.forEach((f: any) => { if (isWin(f, fighter.id)) w++; else if (isLoss(f)) l++; });
    return `${w}W - ${l}L`;
  };

  const ScopeBtn = ({ k, label }: { k: ScopeTab; label: string }) => (
    <button onClick={() => setScope(k)} style={{
      padding: "8px 22px", borderRadius: 8, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
      cursor: "pointer", border: "none", transition: "all 0.2s",
      background: scope === k ? GOLD_TINT : "transparent",
      color: scope === k ? GOLD : MUTED,
    }}>{label}</button>
  );

  const AnalyticsTabBtn = ({ k, label }: { k: AnalyticsTab; label: string }) => (
    <button onClick={() => setAnalyticsTab(k)} style={{
      flex: 1, padding: "10px 0", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
      cursor: "pointer", background: "none", border: "none",
      color: analyticsTab === k ? GOLD : MUTED,
      borderBottom: analyticsTab === k ? `2px solid ${GOLD}` : "2px solid transparent",
      transition: "all 0.2s",
    }}>{label}</button>
  );

  const fighterName = (fighter as any)?.name ?? "Fighter";
  const fighterDesc = `${fighterName} — combat sports fighter profile, record, stats, and fight history on MatchUp.`;
  const fighterJsonLd = fighter ? {
    "@context": "https://schema.org",
    "@type": "Person",
    name: fighterName,
    nationality: (fighter as any).country,
    image: (fighter as any).profile_image || undefined,
    description: fighterDesc,
  } : undefined;
  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <SEO title={fighterName} description={fighterDesc} ogType="profile" image={(fighter as any)?.profile_image ?? undefined} jsonLd={fighterJsonLd} />
      <Header />


      <main className="pt-20 pb-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="mx-auto" style={{ maxWidth: 1280, padding: "0 24px" }}>

          {/* Back link */}
          <button onClick={() => fromParam === "roster" ? navigate("/dashboard?section=roster") : navigate(-1)}
            aria-label="Back to fighters"
            className="flex items-center gap-2"
            style={{ background: "none", border: "none", color: MUTED, fontSize: 13, cursor: "pointer", padding: "0 0 16px" }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Fighters
          </button>

          {/* ════ HERO CARD ════ */}
          <div style={{
            background: constellationBg, borderRadius: 16, padding: 32, boxShadow: CARD_SHADOW,
            position: "relative", overflow: "hidden",
          }}>
            {/* Action buttons top-right */}
            <div className="flex items-center gap-2" style={{ position: "absolute", top: 20, right: 20, zIndex: 2 }}>
              <button onClick={handleShare} style={{
                width: 34, height: 34, borderRadius: "50%", background: INSET, color: MUTED,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none",
                boxShadow: INSET_SHADOW,
              }}><Share2 style={{ width: 14, height: 14 }} /></button>
              {showFollow && (
                <button onClick={toggleFollow} disabled={followLoading} style={{
                  borderRadius: 8, padding: "8px 18px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                  background: isFollowing ? GOLD_TINT : "transparent",
                  color: GOLD,
                  border: `1.5px solid ${GOLD}`,
                  cursor: "pointer",
                }}>
                  {isFollowing ? "Following" : "+ Follow"}
                </button>
              )}
            </div>

            <div className="grid gap-6 md:gap-8 md:[grid-template-columns:auto_1fr] [grid-template-columns:1fr] justify-items-center md:justify-items-start text-center md:text-left items-center">
              {/* Avatar */}
              <div style={{
                width: 140, height: 140, borderRadius: "50%",
                border: `2px solid ${GOLD}`,
                boxShadow: `0 0 0 4px rgba(232,160,32,0.1), 0 0 32px rgba(232,160,32,0.15)`,
                overflow: "hidden", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: fighter._avatar ? "transparent" : "linear-gradient(135deg, rgba(232,160,32,0.18), rgba(232,160,32,0.04))",
              }}>
                {fighter._avatar ? (
                  <img src={fighter._avatar} alt={cleanName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: GOLD, letterSpacing: "0.04em" }}>{initials}</span>
                )}
              </div>

              {/* Right side */}
              <div style={{ minWidth: 0 }}>
                {nickname && (
                  <div style={{ fontSize: 12, fontStyle: "italic", color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
                    "{nickname}"
                  </div>
                )}
                <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.5rem, 4.5vw, 3.6rem)", lineHeight: 1, color: TEXT, letterSpacing: "0.02em", margin: "4px 0 10px" }}>
                  {cleanName.toUpperCase()}
                </h1>
                <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 13, color: MUTED }}>
                  <FlagIcon countryCode={fighter.country} size={18} />
                  <span style={{ fontWeight: 600 }}>{fighter.country}</span>
                  <span style={{ color: DIM }}>·</span>
                  <span>{WEIGHT_CLASS_LABELS[fighter.weight_class] || fighter.weight_class}</span>
                  <span style={{ color: DIM }}>·</span>
                  <span style={{ textTransform: "uppercase" }}>{fighter.discipline || "—"}</span>
                </div>

                {/* Stat pills */}
                <div className="flex gap-2 flex-wrap" style={{ marginTop: 16 }}>
                  <StatPill value={stats.wins} label="W" color={GREEN} bg="rgba(34,197,94,0.12)" />
                  <StatPill value={stats.losses} label="L" color={RED} bg="rgba(239,68,68,0.12)" />
                  <StatPill value={stats.draws} label="D" color={MUTED} />
                  <StatPill value={stats.kos + stats.tkos} label="KOs" color={GOLD} bg={GOLD_TINT} />
                  <StatPill value={`${winRate}%`} label="Win %" color={GOLD} bg={GOLD_TINT} />
                </div>

                {/* Titles */}
                {titles.length > 0 && (
                  <div className="flex gap-2 flex-wrap" style={{ marginTop: 14 }}>
                    {titles.slice(0, 3).map((t: any) => (
                      <span key={t.id} className="flex items-center gap-1.5" style={{
                        background: GOLD_TINT, borderRadius: 9999, padding: "5px 12px", fontSize: 11, fontWeight: 600, color: GOLD, letterSpacing: "0.04em", textTransform: "uppercase",
                      }}>
                        <Award style={{ width: 12, height: 12 }} />
                        {t.title}{t.organisation ? ` · ${t.organisation}` : ""}
                      </span>
                    ))}
                  </div>
                )}

                {/* Divider */}
                <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "18px 0 14px" }} />

                {/* Meta row */}
                <div className="flex gap-5 flex-wrap" style={{ fontSize: 12 }}>
                  {[
                    { l: "HT", v: formatHeight(fighter.height) },
                    { l: "RCH", v: formatReach(fighter.reach) },
                    { l: "WT", v: fighter.walk_around_weight_kg ? `${Math.round(fighter.walk_around_weight_kg * 2.205)} lbs` : "—" },
                    { l: "STANCE", v: fighter.stance ? fighter.stance.charAt(0).toUpperCase() + fighter.stance.slice(1) : "—" },
                    { l: "AGE", v: age ?? "—" },
                    { l: "GYM", v: gymName },
                  ].map(m => (
                    <div key={m.l} className="flex items-center gap-1.5">
                      <span style={{ color: MUTED, fontWeight: 700, letterSpacing: "0.08em" }}>{m.l}</span>
                      <span style={{ color: TEXT, fontWeight: 600 }}>{m.v}</span>
                    </div>
                  ))}
                </div>

                {/* Socials */}
                <div className="flex gap-2" style={{ marginTop: 14 }}>
                  {[Instagram, Twitter, Youtube, Globe].map((Icon, i) => (
                    <div key={i} style={{
                      width: 30, height: 30, borderRadius: 8, background: INSET,
                      display: "flex", alignItems: "center", justifyContent: "center", color: MUTED,
                      boxShadow: INSET_SHADOW, cursor: "default",
                    }}>
                      <Icon style={{ width: 13, height: 13 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {isOwnerOrCoach && <div style={{ marginTop: 16 }}><ProfileCompletionBar fighterId={fighter.id} fighterProfile={fighter} /></div>}

          {/* ════ MAIN GRID ════ */}
          <div className="grid gap-6 grid-cols-1 md:[grid-template-columns:minmax(0,1.6fr)_minmax(0,1fr)]" style={{ marginTop: 24 }}>

            {/* ─── LEFT COLUMN ─── */}
            <div>
              {/* Scope tabs */}
              <div className="flex gap-1" style={{ background: SURFACE, borderRadius: 10, padding: 4, width: "fit-content", boxShadow: INSET_SHADOW }}>
                <ScopeBtn k="total" label="Total" />
                <ScopeBtn k="pro" label="Pro" />
                <ScopeBtn k="amateur" label="Amateur" />
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-4 gap-3" style={{ marginTop: 16 }}>
                <KpiCard value={stats.wins} label="Wins" color={GOLD} />
                <KpiCard value={stats.losses} label="Losses" />
                <KpiCard value={stats.draws} label="Draws" />
                <KpiCard value={stats.kos + stats.tkos} label="KO + TKO" color={GOLD} />
              </div>

              {/* Pro Record Summary */}
              <div style={{ marginTop: 16, background: SURFACE, borderRadius: 12, padding: 24, boxShadow: CARD_SHADOW }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                    {stats.stated ? "Stated Record" : scope === "amateur" ? "Amateur Record Summary" : scope === "pro" ? "Pro Record Summary" : "Career Record Summary"}
                  </span>
                  {stats.wins > 0 && (
                    <span style={{ background: GOLD_TINT, color: GOLD, borderRadius: 9999, padding: "4px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>
                      Finish Rate {finishRate}%
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 56, color: TEXT, textAlign: "center", letterSpacing: "0.04em", margin: "16px 0 18px", lineHeight: 1 }}>
                  {stats.wins} · {stats.losses} · {stats.draws}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: "0.1em", textTransform: "uppercase" }}>Wins</span>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: GREEN }}>{stats.wins}</span>
                    </div>
                    <MethodBar label="KO/TKO" count={stats.kos + stats.tkos} max={stats.wins} color={GREEN} />
                    <MethodBar label="DEC" count={stats.decs} max={stats.wins} color={GREEN} />
                    <MethodBar label="SUB" count={stats.subs} max={stats.wins} color={GREEN} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 11, fontWeight: 700, color: RED, letterSpacing: "0.1em", textTransform: "uppercase" }}>Losses</span>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: RED }}>{stats.losses}</span>
                    </div>
                    <MethodBar label="KO/TKO" count={stats.lossKos + stats.lossTkos} max={stats.losses} color={RED} />
                    <MethodBar label="DEC" count={stats.lossDecs} max={stats.losses} color={RED} />
                    <MethodBar label="SUB" count={stats.lossSubs} max={stats.losses} color={RED} />
                  </div>
                </div>
              </div>

              {/* Filter pills */}
              <div className="flex gap-2" style={{ marginTop: 20 }}>
                {(["all", "kos", "subs", "decs"] as const).map((f) => (
                  <button key={f} onClick={() => setFightFilter(f)} style={{
                    padding: "7px 18px", borderRadius: 9999, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                    cursor: "pointer", border: "none", transition: "all 0.2s",
                    background: fightFilter === f ? GOLD_TINT : INSET,
                    color: fightFilter === f ? GOLD : MUTED,
                    boxShadow: INSET_SHADOW,
                  }}>
                    {f === "all" ? "All" : f === "kos" ? "KOs" : f === "subs" ? "SUBs" : "DECs"}
                  </button>
                ))}
              </div>

              {/* Fight history */}
              <div style={{ marginTop: 14 }}>
                {filteredFights.length === 0 ? (
                  <p style={{ fontSize: 13, color: MUTED, textAlign: "center", padding: "40px 20px" }}>No fight record available</p>
                ) : (
                  grouped.map(([year, yearFights]) => (
                    <div key={year} style={{ marginTop: 18 }}>
                      <div className="flex items-end justify-between" style={{ paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: TEXT, letterSpacing: "0.04em", lineHeight: 1 }}>{year}</span>
                        <span style={{ fontSize: 11, color: MUTED, letterSpacing: "0.08em", fontWeight: 700 }}>{yearRecord(yearFights)}</span>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        {yearFights.map((fight: any) => {
                          const w = isWin(fight, fighter.id);
                          const l = isLoss(fight);
                          const resultLetter = w ? "W" : l ? "L" : "D";
                          const resultColor = w ? GREEN : l ? RED : MUTED;
                          const resultBg = w ? "rgba(34,197,94,0.12)" : l ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)";
                          const opName = fight.opponent_name ?? "Unknown";
                          const running = runningRecords.get(fight.id) || "";
                          const dateStr = fight.event_date ? new Date(fight.event_date).toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-") : "";
                          const methodTag = (isKO(fight.method) || isTKO(fight.method)) ? "KO" : isSub(fight.method) ? "SUB" : isDec(fight.method) ? "DEC" : (fight.method || "—");

                          return (
                            <div key={fight.id} style={{ background: SURFACE, borderRadius: 10, padding: "12px 14px", marginTop: 6, boxShadow: CARD_SHADOW }}>
                              <div className="flex items-center gap-3">
                                <div style={{
                                  width: 32, height: 32, borderRadius: 6, background: resultBg, color: resultColor, flexShrink: 0,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 13, fontWeight: 800,
                                }}>
                                  {resultLetter}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>
                                    {opName} {running && <span style={{ color: MUTED, fontWeight: 500, fontSize: 12 }}>({running})</span>}
                                  </div>
                                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                                    {fight.event_name || "—"}{dateStr && ` · ${dateStr}`}
                                  </div>
                                </div>
                                <span style={{
                                  background: INSET, color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                                  padding: "4px 10px", borderRadius: 9999, textTransform: "uppercase",
                                }}>{methodTag}</span>
                                {fight.round && (
                                  <span style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>R{fight.round}</span>
                                )}
                                <button onClick={() => setExpandedFight(expandedFight === fight.id ? null : fight.id)} style={{
                                  background: "none", border: "none", cursor: "pointer", color: DIM,
                                  transform: expandedFight === fight.id ? "rotate(180deg)" : "none", transition: "transform 0.2s",
                                }}>
                                  <ChevronDown style={{ width: 16, height: 16 }} />
                                </button>
                              </div>
                              {expandedFight === fight.id && (
                                <div style={{ marginTop: 10, paddingLeft: 44, fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
                                  {fight.event_name && <div>Event: <span style={{ color: TEXT }}>{fight.event_name}</span></div>}
                                  {fight.method && <div>Method: <span style={{ color: TEXT }}>{fight.method}</span></div>}
                                  {fight.round && <div>Round: <span style={{ color: TEXT }}>{fight.round}{fight.total_rounds ? ` of ${fight.total_rounds}` : ""}</span></div>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ─── RIGHT COLUMN ─── */}
            <div>
              {/* Performance Analytics card */}
              <div style={{ background: SURFACE, borderRadius: 12, padding: 20, boxShadow: CARD_SHADOW }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase" }}>Performance Analytics</span>
                  <ChevronDown style={{ width: 14, height: 14, color: MUTED }} />
                </div>
                <div className="flex" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 18 }}>
                  <AnalyticsTabBtn k="overview" label="Overview" />
                  <AnalyticsTabBtn k="striking" label="Striking" />
                  <AnalyticsTabBtn k="activity" label="Activity" />
                  <AnalyticsTabBtn k="radar" label="Radar" />
                </div>

                {analyticsTab === "overview" && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { v: `${winRate}%`, l: "Win Rate" },
                        { v: `${finishRate}%`, l: "Finish Rate" },
                        { v: `${decisionRate}%`, l: "Decision Rate" },
                      ].map(t => (
                        <div key={t.l} style={{ background: INSET, borderRadius: 8, padding: "14px 10px", textAlign: "center", boxShadow: INSET_SHADOW }}>
                          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: GOLD, lineHeight: 1 }}>{t.v}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>{t.l}</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2" style={{ marginTop: 10 }}>
                      {[
                        { v: stats.kos, l: "KOs" }, { v: stats.tkos, l: "TKOs" },
                        { v: stats.subs, l: "Subs" }, { v: stats.decs, l: "Decisions" },
                      ].map(t => (
                        <div key={t.l} style={{ background: INSET, borderRadius: 8, padding: "12px 10px", textAlign: "center", boxShadow: INSET_SHADOW }}>
                          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: TEXT, lineHeight: 1 }}>{t.v}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>{t.l}</div>
                        </div>
                      ))}
                    </div>
                    {last8.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Last 8 Results</div>
                        <div className="flex gap-1.5">
                          {last8.map((r, i) => (
                            <div key={i} style={{
                              width: 22, height: 22, borderRadius: "50%",
                              background: r === "W" ? GREEN : r === "L" ? RED : MUTED,
                              color: "hsl(var(--primary-foreground))", fontSize: 11, fontWeight: 800,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>{r}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {analyticsTab === "striking" && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: GREEN, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Wins by Method</div>
                    <MethodBar label="KO/TKO" count={stats.kos + stats.tkos} max={stats.wins} color={GREEN} />
                    <MethodBar label="DEC" count={stats.decs} max={stats.wins} color={GREEN} />
                    <MethodBar label="SUB" count={stats.subs} max={stats.wins} color={GREEN} />
                    <div style={{ fontSize: 10, fontWeight: 700, color: RED, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 14, marginBottom: 4 }}>Losses by Method</div>
                    <MethodBar label="KO/TKO" count={stats.lossKos + stats.lossTkos} max={stats.losses} color={RED} />
                    <MethodBar label="DEC" count={stats.lossDecs} max={stats.losses} color={RED} />
                    <MethodBar label="SUB" count={stats.lossSubs} max={stats.losses} color={RED} />
                    <div className="grid grid-cols-2 gap-2" style={{ marginTop: 14 }}>
                      <div style={{ background: INSET, borderRadius: 8, padding: "14px 10px", textAlign: "center", boxShadow: INSET_SHADOW }}>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: GOLD, lineHeight: 1 }}>{stats.avgFinishRound ? stats.avgFinishRound.toFixed(1) : "—"}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>Avg Finish Round</div>
                      </div>
                      <div style={{ background: INSET, borderRadius: 8, padding: "14px 10px", textAlign: "center", boxShadow: INSET_SHADOW }}>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: GOLD, lineHeight: 1 }}>{koRate}%</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>KO Rate</div>
                      </div>
                    </div>
                  </>
                )}

                {analyticsTab === "activity" && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Fights Per Year</div>
                    <div style={{ height: 130 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={fightsPerYear}>
                          <XAxis dataKey="year" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis hide />
                          <Tooltip cursor={{ fill: "rgba(232,160,32,0.08)" }} contentStyle={{ background: INSET, border: "none", borderRadius: 6, fontSize: 11 }} labelStyle={{ color: TEXT }} />
                          <Bar dataKey="count" fill={GOLD} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2" style={{ marginTop: 10 }}>
                      <div style={{ background: INSET, borderRadius: 8, padding: "14px 10px", textAlign: "center", boxShadow: INSET_SHADOW }}>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: TEXT, lineHeight: 1 }}>{scopedFights.length}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>Career Fights</div>
                      </div>
                      <div style={{ background: INSET, borderRadius: 8, padding: "14px 10px", textAlign: "center", boxShadow: INSET_SHADOW }}>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: TEXT, lineHeight: 1 }}>{fighter.years_training ?? "—"}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>Years Active</div>
                      </div>
                    </div>
                    {promotionRecord.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Record by Promotion</div>
                        {promotionRecord.map(([p, r]) => (
                          <div key={p} className="flex items-center justify-between" style={{ padding: "6px 0", fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <span style={{ color: TEXT, fontWeight: 600 }}>{p}</span>
                            <span style={{ color: MUTED, fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, letterSpacing: "0.04em" }}>{r.w}-{r.l}-{r.d}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {analyticsTab === "radar" && (
                  <>
                    <div style={{ height: 240 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} outerRadius="70%">
                          <PolarGrid stroke="rgba(255,255,255,0.08)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: MUTED, fontSize: 10 }} />
                          <Radar dataKey="value" stroke={GOLD} fill={GOLD} fillOpacity={0.35} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2" style={{ marginTop: 10, fontSize: 11, color: MUTED }}>
                      <div>KOs: <span style={{ color: TEXT, fontWeight: 700 }}>{stats.kos}</span></div>
                      <div>TKOs: <span style={{ color: TEXT, fontWeight: 700 }}>{stats.tkos}</span></div>
                      <div>Decisions: <span style={{ color: TEXT, fontWeight: 700 }}>{stats.decs}</span></div>
                      <div>Win %: <span style={{ color: GOLD, fontWeight: 700 }}>{winRate}%</span></div>
                    </div>
                  </>
                )}
              </div>

              {/* Fighter Profile card */}
              <div style={{ marginTop: 16, background: SURFACE, borderRadius: 12, padding: 20, boxShadow: CARD_SHADOW }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14 }}>Fighter Profile</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { l: "Height", v: formatHeight(fighter.height) },
                    { l: "Weight", v: fighter.walk_around_weight_kg ? `${Math.round(fighter.walk_around_weight_kg * 2.205)} LBS` : "—" },
                    { l: "Reach", v: formatReach(fighter.reach) },
                    { l: "Stance", v: fighter.stance ? fighter.stance.toUpperCase() : "—" },
                    { l: "Age", v: age ?? "—" },
                    { l: "Nationality", v: getCountryDisplayName(fighter.country) },
                  ].map(r => (
                    <div key={r.l} style={{ background: INSET, borderRadius: 8, padding: "12px 14px", boxShadow: INSET_SHADOW }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "0.12em", textTransform: "uppercase" }}>{r.l}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginTop: 4 }}>{r.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* About */}
              {fighter.bio && (
                <div style={{ marginTop: 16, background: SURFACE, borderRadius: 12, padding: 20, boxShadow: CARD_SHADOW }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>About</div>
                  <p style={{ color: MUTED, lineHeight: 1.65, fontSize: 13 }}>{fighter.bio}</p>
                </div>
              )}
            </div>
          </div>

          {/* ════ RELATED FIGHTERS ════ */}
          {related.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: TEXT, letterSpacing: "0.06em", marginBottom: 14 }}>RELATED FIGHTERS</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {related.map((rf: any) => {
                  const ri = rf.name.replace(/"[^"]+"/g, "").trim().split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                  const rw = rf.record_wins ?? 0, rl = rf.record_losses ?? 0, rd = rf.record_draws ?? 0;
                  const rtot = rw + rl + rd;
                  const rwr = rtot > 0 ? Math.round((rw / rtot) * 100) : 0;
                  return (
                    <Link key={rf.id} to={`/fighters/${rf.id}`} style={{
                      background: SURFACE, borderRadius: 12, padding: 16, boxShadow: CARD_SHADOW,
                      display: "flex", flexDirection: "column", alignItems: "center", textDecoration: "none",
                      transition: "transform 0.2s",
                    }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: "50%", border: `2px solid ${GOLD}`,
                        overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                        background: rf.profile_image ? "transparent" : INSET, marginBottom: 10,
                      }}>
                        {rf.profile_image ? (
                          <img src={rf.profile_image} alt={rf.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: GOLD }}>{ri}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, textAlign: "center" }}>{rf.name.replace(/"[^"]+"/g, "").trim()}</div>
                      <div style={{ fontSize: 10, color: MUTED, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {WEIGHT_CLASS_LABELS[rf.weight_class] || rf.weight_class}
                      </div>
                      <div className="flex items-center gap-3" style={{ marginTop: 10, fontSize: 11 }}>
                        <span style={{ color: TEXT, fontWeight: 700 }}>{rw}-{rl}-{rd}</span>
                        <span style={{ color: GOLD, fontWeight: 700 }}>{rwr}%</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gym affiliations */}
          {gyms.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: TEXT, letterSpacing: "0.06em", marginBottom: 12 }}>GYM AFFILIATIONS</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {gyms.map((link: any) => (
                  <Link key={link.gym_id} to={`/gyms/${link.gyms?.id}`} className="flex items-center justify-between" style={{
                    borderRadius: 10, background: SURFACE, padding: "14px 18px", textDecoration: "none",
                    boxShadow: CARD_SHADOW,
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{link.gyms?.name}</div>
                      {link.gyms?.location && <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{link.gyms.location}</div>}
                    </div>
                    {link.is_primary && <span style={{ fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: "0.1em", textTransform: "uppercase", background: GOLD_TINT, padding: "4px 10px", borderRadius: 9999 }}>Primary</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
