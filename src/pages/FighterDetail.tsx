import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, ShieldCheck, Target, Calendar, Share2, Trophy, BarChart3 } from "lucide-react";
import { FighterFightHistory } from "@/components/fighter/FighterFightHistory";
import { ProfileCompletionBar } from "@/components/fighter/ProfileCompletionBar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/hooks/useFollow";
import { toast } from "sonner";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import logoWhite from "@/assets/logo-full-white.svg";

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

import { STYLE_LABELS } from "@/lib/format";

const EX = {
  bg: "#0d0f12", card: "#14171e", raised: "#1a1e28",
  border: "rgba(255,255,255,0.06)", borderMid: "rgba(255,255,255,0.1)",
  gold: "#e8a020", goldDim: "rgba(232,160,32,0.12)", goldBorder: "rgba(232,160,32,0.25)",
  text: "#e8eaf0", muted: "#8b909e", dimmed: "#555b6b",
};

export default function FighterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const fromParam = searchParams.get("from");

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
        const { data: profile } = await supabase
          .from("profiles").select("avatar_url").eq("id", data.user_id).single();
        avatarUrl = profile?.avatar_url || null;
      }

      return { ...data, _avatar: data.profile_image || avatarUrl || null };
    },
    enabled: !!id,
  });

  // Fight results for stats
  const { data: fightResults = [] } = useQuery({
    queryKey: ["fighter-results", id],
    queryFn: async () => {
      if (!fighter?.id) return [];
      const { data } = await supabase
        .from("fight_results")
        .select("*")
        .or(`fighter_a_id.eq.${fighter.id},fighter_b_id.eq.${fighter.id}`)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!fighter?.id,
  });

  // Upcoming events
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["fighter-upcoming", id],
    queryFn: async () => {
      if (!fighter?.id) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("event_fight_slots")
        .select("*, events!event_fight_slots_event_id_fkey(id, title, date)")
        .or(`fighter_a_id.eq.${fighter.id},fighter_b_id.eq.${fighter.id}`)
        .eq("status", "confirmed");
      return (data ?? []).filter((s: any) => s.events?.date >= today);
    },
    enabled: !!fighter?.id,
  });

  // Opponent names for fight history
  const { data: opponentMap = {} } = useQuery({
    queryKey: ["fighter-opponents", fightResults.map(r => r.id).join(",")],
    queryFn: async () => {
      if (!fighter?.id || fightResults.length === 0) return {};
      const opIds = new Set<string>();
      fightResults.forEach((r: any) => {
        const opId = r.fighter_a_id === fighter.id ? r.fighter_b_id : r.fighter_a_id;
        if (opId) opIds.add(opId);
      });
      if (opIds.size === 0) return {};
      const { data } = await supabase.from("fighter_profiles").select("id, name").in("id", Array.from(opIds));
      const map: Record<string, string> = {};
      data?.forEach((f: any) => { map[f.id] = f.name; });
      return map;
    },
    enabled: fightResults.length > 0 && !!fighter?.id,
  });

  // Event names for fight history
  const { data: eventMap = {} } = useQuery({
    queryKey: ["fighter-events", fightResults.map(r => r.event_id).filter(Boolean).join(",")],
    queryFn: async () => {
      const eventIds = [...new Set(fightResults.map((r: any) => r.event_id).filter(Boolean))];
      if (eventIds.length === 0) return {};
      const { data } = await supabase.from("events").select("id, title").in("id", eventIds as string[]);
      const map: Record<string, string> = {};
      data?.forEach((e: any) => { map[e.id] = e.title; });
      return map;
    },
    enabled: fightResults.length > 0,
  });

  const { isFollowing, toggle: toggleFollow, loading: followLoading, followerCount } = useFollow(fighter?.user_id);

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: EX.bg }}>
        <Header />
        <main className="pt-16"><div className="container py-16"><div className="h-8 w-64 animate-pulse rounded mb-4" style={{ background: EX.card }} /></div></main>
      </div>
    );
  }

  if (!fighter) {
    return (
      <div className="min-h-screen" style={{ background: EX.bg }}>
        <Header />
        <main className="pt-16"><div className="container py-16 text-center">
          <h1 className="font-heading text-3xl mb-4" style={{ color: EX.text }}>Fighter Not Found</h1>
          <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        </div></main>
        <Footer />
      </div>
    );
  }

  const gyms = (fighter.fighter_gym_links ?? []).filter((l: any) => l.status === "approved");
  const primaryGym = gyms.find((l: any) => l.is_primary);
  const gymName = primaryGym?.gyms?.name ?? (gyms[0]?.gyms?.name ?? "Independent");
  const isOwnerOrCoach = user && (fighter.user_id === user.id || fighter.created_by_coach_id === user.id);
  const showFollow = user && fighter.user_id && fighter.user_id !== user.id;

  // Compute stats from fight_results
  const wins = fightResults.filter((r: any) => r.winner_id === fighter.id).length;
  const losses = fightResults.filter((r: any) => r.winner_id && r.winner_id !== fighter.id).length;
  const draws = fightResults.filter((r: any) => !r.winner_id).length;
  const kos = fightResults.filter((r: any) => r.winner_id === fighter.id && r.method?.toLowerCase().includes("ko") && !r.method?.toLowerCase().includes("tko")).length;
  const tkos = fightResults.filter((r: any) => r.winner_id === fighter.id && r.method?.toLowerCase().includes("tko")).length;
  const subs = fightResults.filter((r: any) => r.winner_id === fighter.id && r.method?.toLowerCase().includes("sub")).length;
  const decisions = fightResults.filter((r: any) => r.winner_id === fighter.id && r.method?.toLowerCase().includes("decision")).length;
  const total = wins + losses + draws;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  // Use profile record if no fight_results
  const displayWins = fightResults.length > 0 ? wins : fighter.record_wins;
  const displayLosses = fightResults.length > 0 ? losses : fighter.record_losses;
  const displayDraws = fightResults.length > 0 ? draws : fighter.record_draws;

  // Radar chart data
  const maxFinish = Math.max(kos, tkos, subs, decisions, 1);
  const radarData = [
    { subject: "Knockouts", value: Math.round((kos / maxFinish) * 100) },
    { subject: "TKOs", value: Math.round((tkos / maxFinish) * 100) },
    { subject: "Submissions", value: Math.round((subs / maxFinish) * 100) },
    { subject: "Decisions", value: Math.round((decisions / maxFinish) * 100) },
    { subject: "Strike Acc.", value: 0 },
    { subject: "Takedown Acc.", value: 0 },
  ];

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Profile link copied!");
  };

  return (
    <div className="min-h-screen" style={{ background: EX.bg }}>
      <Header />
      <main className="pt-14">
        <section style={{ padding: "10px 0" }}>
          <div className="container max-w-4xl" style={{ paddingLeft: 24, paddingRight: 24 }}>
            <div className="pt-2">
              <button onClick={() => fromParam === "roster" ? navigate("/dashboard?section=roster") : navigate(-1)} className="flex items-center gap-1.5 mb-6" style={{ color: EX.muted, fontSize: 13, cursor: "pointer", background: "none", border: "none" }}>
                <ArrowLeft style={{ width: 16, height: 16 }} />{fromParam === "roster" ? "Back to Roster" : "Back"}
              </button>
            </div>

            {isOwnerOrCoach && <ProfileCompletionBar fighterId={fighter.id} fighterProfile={fighter} />}

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

              {/* HERO SECTION */}
              <div style={{ position: "relative", minHeight: 200, borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
                <div className="flex" style={{ minHeight: 200 }}>
                  {/* Left content */}
                  <div style={{ flex: "0 0 60%", background: EX.bg, padding: 24, position: "relative", zIndex: 2, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    {/* Win rate badge */}
                    <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", borderRadius: 8, padding: "8px 12px" }}>
                      <span style={{ fontSize: 9, color: EX.muted, display: "block" }}>Win Rate</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: EX.gold }}>{winRate}%</span>
                    </div>

                    {fighter.discipline && (
                      <span style={{ fontSize: 9, color: EX.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{fighter.discipline.toUpperCase()}</span>
                    )}
                    <div className="flex items-center gap-2">
                      <h1 style={{ fontSize: 24, fontWeight: 700, color: EX.text }}>{fighter.name}</h1>
                      {fighter.verified && <ShieldCheck style={{ width: 18, height: 18, color: EX.gold }} />}
                    </div>
                    <p style={{ fontSize: 12, color: EX.muted, marginTop: 2 }}>{followerCount} Followers</p>

                    {/* Stats row */}
                    <div className="flex" style={{ marginTop: 16, border: `1px solid ${EX.border}`, borderRadius: 8, overflow: "hidden" }}>
                      {[
                        { label: "Wins", value: displayWins, highlight: false },
                        { label: "Losses", value: displayLosses, highlight: false },
                        { label: "Draws", value: displayDraws, highlight: false },
                        { label: "Knockouts", value: kos + tkos, highlight: true },
                      ].map((s, i) => (
                        <div key={s.label} style={{
                          flex: 1, textAlign: "center", padding: "16px 0",
                          borderRight: i < 3 ? `1px solid ${EX.border}` : "none",
                          background: s.highlight ? "rgba(232,160,32,0.1)" : "transparent",
                          ...(s.highlight ? { border: `1px solid rgba(232,160,32,0.2)`, borderRadius: 8 } : {}),
                        }}>
                          <span style={{ fontSize: 28, fontWeight: 700, color: s.highlight ? EX.gold : EX.text }}>{s.value}</span>
                          <span style={{ fontSize: 11, color: EX.muted, display: "block" }}>{s.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Follow + Share */}
                    <div className="flex gap-3" style={{ marginTop: 16 }}>
                      {showFollow && (
                        <button
                          onClick={toggleFollow}
                          disabled={followLoading}
                          style={{
                            flex: 1, padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                            background: isFollowing ? EX.goldDim : EX.gold,
                            color: isFollowing ? EX.gold : EX.bg,
                            border: isFollowing ? `1px solid ${EX.gold}` : "none",
                          }}
                        >
                          {isFollowing ? "✓ Following" : "Follow Fighter"}
                        </button>
                      )}
                      <button
                        onClick={handleShare}
                        style={{
                          flex: showFollow ? undefined : 1, padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                          background: "transparent", border: `1px solid ${EX.border}`, color: EX.muted, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                      >
                        <Share2 style={{ width: 14, height: 14 }} /> Share Profile
                      </button>
                    </div>
                  </div>

                  {/* Right photo */}
                  <div style={{ flex: "0 0 40%", position: "relative", background: EX.raised }}>
                    {fighter._avatar ? (
                      <>
                        <img src={fighter._avatar} alt={fighter.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #0d0f12 0%, transparent 60%)" }} />
                      </>
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img src={logoWhite} alt="" style={{ width: 120, opacity: 0.06 }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: Performance Analytics + Fighter Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ marginBottom: 24 }}>
                {/* Left — Radar */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Target style={{ width: 16, height: 16, color: EX.gold }} />
                    <span style={{ fontSize: 16, fontWeight: 600, color: EX.text }}>Performance Analytics</span>
                  </div>
                  <div style={{ background: EX.raised, borderRadius: 8, padding: 16, border: `1px solid ${EX.border}` }}>
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.06)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: EX.muted, fontSize: 11 }} />
                        <Radar name="fighter" dataKey="value" stroke={EX.gold} fill="rgba(232,160,32,0.3)" fillOpacity={1} dot={{ fill: EX.gold, r: 4 } as any} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2" style={{ marginTop: 8 }}>
                    {[{ label: "Strike Accuracy", value: "N/A" }, { label: "Takedown Accuracy", value: "N/A" }].map((s) => (
                      <div key={s.label} style={{ background: EX.raised, borderRadius: 6, padding: 12, border: `1px solid ${EX.border}` }}>
                        <span style={{ fontSize: 10, color: EX.muted }}>{s.label}</span>
                        <span style={{ fontSize: 20, fontWeight: 700, color: EX.text, display: "block" }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right — Fighter Info */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span style={{ fontSize: 16, fontWeight: 600, color: EX.text }}>Fighter Information</span>
                  </div>
                  <div style={{ background: EX.raised, borderRadius: 8, padding: 16, border: `1px solid ${EX.border}` }}>
                    {[
                      { icon: Trophy, label: "Weight Class", value: WEIGHT_CLASS_LABELS[fighter.weight_class] || fighter.weight_class },
                      { icon: MapPin, label: "Training Gym", value: gymName },
                      { icon: BarChart3, label: "Professional Record", value: `${displayWins}-${displayLosses}-${displayDraws}` },
                    ].map((row, i) => (
                      <div key={row.label}>
                        <div className="flex items-center gap-3 py-3">
                          <row.icon style={{ width: 16, height: 16, color: EX.gold, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontSize: 11, color: EX.muted }}>{row.label}</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: EX.text, display: "block" }}>{row.value}</span>
                          </div>
                        </div>
                        {i < 2 && <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />}
                      </div>
                    ))}
                  </div>

                  {/* Finish Methods */}
                  <div style={{ marginTop: 16 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: EX.text }}>Finish Methods</span>
                    <div className="grid grid-cols-2 gap-2" style={{ marginTop: 8 }}>
                      {[
                        { label: "Knockouts", value: kos },
                        { label: "TKOs", value: tkos },
                        { label: "Submissions", value: subs },
                        { label: "Decisions", value: decisions },
                      ].map((m) => (
                        <div key={m.label} style={{
                          background: EX.raised, borderRadius: 8, padding: 14, border: `1px solid ${EX.border}`,
                          transition: "border-color 0.2s", cursor: "default",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(232,160,32,0.2)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = EX.border; }}
                        >
                          <span style={{ fontSize: 22, fontWeight: 700, color: EX.text }}>{m.value}</span>
                          <span style={{ fontSize: 11, color: EX.muted, display: "block" }}>{m.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Fight History */}
              {fightResults.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar style={{ width: 16, height: 16, color: EX.gold }} />
                    <span style={{ fontSize: 16, fontWeight: 600, color: EX.text }}>Fight History</span>
                  </div>
                  <div className="space-y-2">
                    {fightResults.slice(0, 10).map((result: any) => {
                      const isWin = result.winner_id === fighter.id;
                      const isLoss = result.winner_id && result.winner_id !== fighter.id;
                      const resultLabel = isWin ? "Win" : isLoss ? "Loss" : "Draw";
                      const resultBg = isWin ? "#22c55e" : isLoss ? "#ef4444" : "#f59e0b";
                      const opId = result.fighter_a_id === fighter.id ? result.fighter_b_id : result.fighter_a_id;
                      const opName = opId ? (opponentMap as any)[opId] ?? "Unknown" : "Unknown";
                      const eventName = result.event_id ? (eventMap as any)[result.event_id] ?? "" : "";
                      const date = new Date(result.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

                      return (
                        <div key={result.id} className="flex items-center" style={{
                          background: "rgba(255,255,255,0.02)", border: `1px solid ${EX.border}`,
                          borderRadius: 8, padding: "12px 16px", transition: "background 0.15s", cursor: "pointer",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                        >
                          <span style={{ background: resultBg, color: "white", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, minWidth: 40, textAlign: "center" }}>{resultLabel}</span>
                          <div style={{ marginLeft: 12 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: EX.text }}>vs {opName}</span>
                            {result.method && <span style={{ fontSize: 12, color: EX.muted, display: "block" }}>{result.method}{result.round ? ` - Round ${result.round}` : ""}</span>}
                          </div>
                          <div style={{ marginLeft: "auto", textAlign: "right" }}>
                            {eventName && <span style={{ fontSize: 13, fontWeight: 600, color: EX.text, display: "block" }}>{eventName}</span>}
                            <span style={{ fontSize: 12, color: EX.muted }}>{date}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {fightResults.length > 10 && (
                    <p style={{ fontSize: 12, color: EX.gold, textAlign: "center", padding: "8px 0", cursor: "pointer" }}>View full record</p>
                  )}
                </div>
              )}

              {/* Existing fight history component for fights table */}
              <FighterFightHistory fighterId={fighter.id} fighterUserId={fighter.user_id ?? undefined} isOwner={false} />

              {/* SECTION 4: Upcoming Events */}
              {upcomingEvents.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar style={{ width: 16, height: 16, color: EX.gold }} />
                    <span style={{ fontSize: 16, fontWeight: 600, color: EX.text }}>Upcoming Events</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {upcomingEvents.map((slot: any) => (
                      <Link key={slot.id} to={`/events/${slot.events?.id}`} style={{
                        background: "rgba(232,160,32,0.06)", border: "1px solid rgba(232,160,32,0.2)",
                        borderRadius: 8, padding: "14px 16px", transition: "all 0.2s", display: "block",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(232,160,32,0.1)"; e.currentTarget.style.borderColor = "rgba(232,160,32,0.35)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(232,160,32,0.06)"; e.currentTarget.style.borderColor = "rgba(232,160,32,0.2)"; }}
                      >
                        <p style={{ fontSize: 14, fontWeight: 700, color: EX.text, textTransform: "uppercase" }}>{slot.events?.title}</p>
                        <p style={{ fontSize: 12, color: EX.muted }}>{slot.events?.date ? new Date(slot.events.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}</p>
                        <p style={{ fontSize: 12, color: EX.muted }}>Scheduled to compete</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {fighter.bio && (
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: EX.text, marginBottom: 12, fontFamily: "'Bebas Neue', sans-serif" }}>ABOUT</h2>
                  <p style={{ color: EX.muted, lineHeight: 1.6 }}>{fighter.bio}</p>
                </div>
              )}

              {/* Gym Affiliations */}
              {gyms.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: EX.text, marginBottom: 12, fontFamily: "'Bebas Neue', sans-serif" }}>GYM AFFILIATIONS</h2>
                  <div className="space-y-3">
                    {gyms.map((link: any) => (
                      <Link
                        key={link.gym_id}
                        to={`/gyms/${link.gyms?.id}`}
                        className="flex items-center justify-between"
                        style={{
                          borderRadius: 8, border: `1px solid ${EX.border}`, background: EX.raised,
                          padding: "10px 14px", transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = EX.goldBorder; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = EX.border; }}
                      >
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: EX.text }}>{link.gyms?.name}</p>
                          {link.gyms?.location && (
                            <p className="flex items-center gap-1 mt-1" style={{ fontSize: 12, color: EX.muted }}>
                              <MapPin style={{ width: 12, height: 12 }} />{link.gyms.location}
                            </p>
                          )}
                        </div>
                        {link.is_primary && <span style={{ fontSize: 12, fontWeight: 500, color: EX.gold }}>Primary</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom action buttons */}
              <div className="flex gap-3" style={{ marginBottom: 32 }}>
                {showFollow && (
                  <button onClick={toggleFollow} disabled={followLoading} style={{
                    flex: 1, padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: isFollowing ? EX.goldDim : EX.gold, color: isFollowing ? EX.gold : EX.bg,
                    border: isFollowing ? `1px solid ${EX.gold}` : "none", transition: "all 0.2s",
                  }}>
                    {isFollowing ? "✓ Following" : "Follow Fighter"}
                  </button>
                )}
                <button onClick={handleShare} style={{
                  flex: 1, padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: "transparent", border: `1px solid ${EX.border}`, color: EX.muted, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <Share2 style={{ width: 14, height: 14 }} /> Share Profile
                </button>
              </div>

            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
