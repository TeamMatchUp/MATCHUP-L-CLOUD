import { X, Trophy, Calendar, Share2, Check, UserMinus, Target } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

interface FighterDetailModalProps {
  fighterId: string;
  onClose: () => void;
}

export function FighterDetailModal({ fighterId, onClose }: FighterDetailModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [followHover, setFollowHover] = useState(false);

  const { data: fighter, isLoading } = useQuery({
    queryKey: ["explore-fighter-detail", fighterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_profiles")
        .select("*, fighter_gym_links(gym_id, is_primary, status, gyms(name))")
        .eq("id", fighterId)
        .single();
      if (!data) return null;
      let avatarUrl: string | null = null;
      if (data.user_id) {
        const { data: profile } = await supabase.from("profiles").select("avatar_url").eq("id", data.user_id).single();
        avatarUrl = profile?.avatar_url || null;
      }
      return { ...data, _avatar: data.profile_image || avatarUrl || null };
    },
    enabled: !!fighterId,
  });

  const { data: fights = [] } = useQuery({
    queryKey: ["explore-fighter-fights", fighterId],
    queryFn: async () => {
      const { data: a } = await supabase.from("fights").select("*, events(title, date)").eq("fighter_a_id", fighterId).order("event_date", { ascending: false }).limit(10);
      const { data: b } = await supabase.from("fights").select("*, events(title, date)").eq("fighter_b_id", fighterId).order("event_date", { ascending: false }).limit(10);
      const map = new Map();
      [...(a || []), ...(b || [])].forEach(f => map.set(f.id, f));
      return Array.from(map.values()).sort((x, y) => (y.event_date || "").localeCompare(x.event_date || "")).slice(0, 10);
    },
    enabled: !!fighterId,
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["explore-fighter-events", fighterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_fight_slots")
        .select("event_id, events(id, title, date)")
        .or(`fighter_a_id.eq.${fighterId},fighter_b_id.eq.${fighterId}`)
        .eq("status", "confirmed")
        .limit(4);
      const unique = new Map();
      (data ?? []).forEach((s: any) => {
        const e = Array.isArray(s.events) ? s.events[0] : s.events;
        if (e && new Date(e.date) > new Date() && !unique.has(e.id)) unique.set(e.id, e);
      });
      return Array.from(unique.values());
    },
    enabled: !!fighterId,
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["follow-state", user?.id, fighter?.user_id],
    queryFn: async () => {
      if (!user || !fighter?.user_id) return false;
      const { data } = await supabase.from("user_follows").select("id").eq("follower_id", user.id).eq("following_id", fighter.user_id).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!fighter?.user_id,
  });

  const { data: followerCount = 0 } = useQuery({
    queryKey: ["follower-count", fighter?.user_id],
    queryFn: async () => {
      if (!fighter?.user_id) return 0;
      const { count } = await supabase.from("user_follows").select("id", { count: "exact", head: true }).eq("following_id", fighter.user_id);
      return count ?? 0;
    },
    enabled: !!fighter?.user_id,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);

  const toggleFollow = async () => {
    if (!user || !fighter?.user_id) return;
    if (isFollowing) {
      await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", fighter.user_id);
    } else {
      await supabase.from("user_follows").insert({ follower_id: user.id, following_id: fighter.user_id });
      await supabase.rpc("create_notification", {
        _user_id: fighter.user_id,
        _title: "New follower",
        _message: `Someone started following you`,
        _type: "system",
      });
    }
    queryClient.invalidateQueries({ queryKey: ["follow-state", user.id, fighter.user_id] });
    queryClient.invalidateQueries({ queryKey: ["follower-count", fighter.user_id] });
  };

  const shareProfile = () => {
    navigator.clipboard.writeText(`${window.location.origin}/explore/fighters?fighter=${fighterId}`);
    toast.success("Profile link copied!");
  };

  if (!fighter && !isLoading) return null;

  // Calculate record
  let wins = 0, losses = 0, draws = 0, kos = 0, tkos = 0, subs = 0, decs = 0;
  fights.forEach(f => {
    const isA = f.fighter_a_id === fighterId;
    if (f.winner_id === fighterId) {
      wins++;
      if (f.method?.toLowerCase().includes("ko") && !f.method?.toLowerCase().includes("tko")) kos++;
      else if (f.method?.toLowerCase().includes("tko")) tkos++;
      else if (f.method?.toLowerCase().includes("sub")) subs++;
      else decs++;
    } else if (f.winner_id) {
      losses++;
    } else if (f.result === "draw") {
      draws++;
    } else if (f.result === "win") {
      if (isA || f.fighter_a_id === f.fighter_b_id) wins++; else losses++;
    } else if (f.result === "loss") {
      if (isA || f.fighter_a_id === f.fighter_b_id) losses++; else wins++;
    }
  });
  const totalFights = wins + losses + draws;
  const winRate = totalFights > 0 ? Math.round((wins / totalFights) * 100) : 0;
  const primaryGym = fighter?.fighter_gym_links?.find((l: any) => l.is_primary && l.status === "approved");
  const gymName = primaryGym?.gyms?.name ?? (Array.isArray(primaryGym?.gyms) ? primaryGym?.gyms[0]?.name : undefined) ?? "Independent";

  const radarData = [
    { stat: "KOs", value: kos },
    { stat: "TKOs", value: tkos },
    { stat: "Subs", value: subs },
    { stat: "Decisions", value: decs },
    { stat: "Strike Acc.", value: 70 },
    { stat: "TD Acc.", value: 60 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose} style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px) saturate(140%)" }}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-in fade-in zoom-in-95 duration-200"
        style={{ width: "min(880px, 95vw)", maxHeight: "90vh", overflowY: "auto", background: "#14171e", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", scrollbarWidth: "thin" as any, scrollbarColor: "rgba(232,160,32,0.3) transparent" }}
      >
        {isLoading ? (
          <div className="p-12 text-center"><div className="h-8 w-48 bg-[#1a1e28] animate-pulse rounded mx-auto" /></div>
        ) : fighter ? (
          <>
            {/* Hero */}
            <div style={{ position: "relative", height: 280, overflow: "hidden" }}>
              <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(20,23,30,1) 0%, rgba(20,23,30,0.7) 50%, transparent 100%)", zIndex: 1 }} />
              {fighter._avatar ? (
                <img src={fighter._avatar} alt={fighter.name} className="absolute right-0 top-0 h-full w-3/5 object-cover object-top" />
              ) : (
                <div className="absolute right-0 top-0 h-full w-3/5 flex items-center justify-center" style={{ background: "#1a1e28" }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 72, color: "#555b6b" }}>
                    {fighter.name.split(" ").filter((n: string) => !n.startsWith('"')).map((n: string) => n[0]).join("").slice(0, 2)}
                  </span>
                </div>
              )}
              {/* Win Rate badge */}
              <div className="absolute top-4 left-6 z-10" style={{ background: "rgba(0,0,0,0.75)", borderRadius: 8, padding: "8px 12px" }}>
                <span style={{ fontSize: 9, color: "#8b909e", display: "block" }}>Win Rate</span>
                <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 18, color: "#e8a020" }}>{winRate}%</span>
              </div>
              <button onClick={onClose} className="absolute top-4 right-4 z-10 flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.5)" }}>
                <X className="h-4 w-4" style={{ color: "#e8eaf0" }} />
              </button>

              {/* Name area */}
              <div className="absolute bottom-16 left-6 z-10">
                <p style={{ fontSize: 10, color: "#8b909e", textTransform: "uppercase", letterSpacing: "0.1em" }}>PROFESSIONAL FIGHTER</p>
                <h2 style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 24, color: "#e8eaf0" }}>{fighter.name}</h2>
                <p style={{ fontSize: 12, color: "#8b909e" }}>{followerCount} Follower{followerCount !== 1 ? "s" : ""}</p>
              </div>

              {/* Stats row */}
              <div className="absolute bottom-3 left-6 right-6 z-10 flex items-center gap-0" style={{ background: "rgba(0,0,0,0.4)", borderRadius: 8, backdropFilter: "blur(8px)" }}>
                {[
                  { label: "Wins", value: wins, highlight: false },
                  { label: "Losses", value: losses, highlight: false },
                  { label: "Draws", value: draws, highlight: false },
                  { label: "Knockouts", value: kos, highlight: true },
                ].map((s, i) => (
                  <div
                    key={s.label}
                    className="flex-1 text-center py-2 transition-colors duration-150 hover:bg-[rgba(255,255,255,0.04)]"
                    style={{
                      borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      background: s.highlight ? "rgba(232,160,32,0.15)" : "transparent",
                      borderRadius: s.highlight ? 8 : 0,
                    }}
                  >
                    <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 28, color: s.highlight ? "#e8a020" : "#e8eaf0", display: "block" }}>{s.value}</span>
                    <span style={{ fontSize: 11, color: "#8b909e" }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance + Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ padding: 24 }}>
              {/* Radar chart */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4" style={{ color: "#e8a020" }} />
                  <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 16, color: "#e8eaf0" }}>Performance Analytics</h3>
                </div>
                <div style={{ background: "#1a1e28", borderRadius: 8, padding: 16 }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.06)" />
                      <PolarAngleAxis dataKey="stat" tick={{ fill: "#8b909e", fontSize: 11 }} />
                      <Radar dataKey="value" fill="rgba(232,160,32,0.3)" stroke="#e8a020" strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Fighter info */}
              <div>
                <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 16, color: "#e8eaf0", marginBottom: 12 }}>Fighter Information</h3>
                <div style={{ background: "#1a1e28", borderRadius: 8, padding: 16 }}>
                  <div className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <Trophy className="h-4 w-4 shrink-0" style={{ color: "#e8a020" }} />
                    <div>
                      <span style={{ fontSize: 11, color: "#8b909e" }}>Weight Class</span>
                      <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#e8eaf0" }}>{WEIGHT_CLASS_LABELS[fighter.weight_class] || fighter.weight_class}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <Trophy className="h-4 w-4 shrink-0" style={{ color: "#e8a020" }} />
                    <div>
                      <span style={{ fontSize: 11, color: "#8b909e" }}>Training Gym</span>
                      <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#e8eaf0" }}>{gymName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-2">
                    <Trophy className="h-4 w-4 shrink-0" style={{ color: "#e8a020" }} />
                    <div>
                      <span style={{ fontSize: 11, color: "#8b909e" }}>Professional Record</span>
                      <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#e8eaf0" }}>{wins}-{losses}-{draws}</p>
                    </div>
                  </div>
                </div>

                {/* Finish Methods */}
                <h4 style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15, color: "#e8eaf0", marginTop: 16, marginBottom: 8 }}>Finish Methods</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Knockouts", value: kos },
                    { label: "TKOs", value: tkos },
                    { label: "Submissions", value: subs },
                    { label: "Decisions", value: decs },
                  ].map(m => (
                    <div
                      key={m.label}
                      className="transition-all duration-200 hover:border-[rgba(232,160,32,0.3)] hover:bg-[rgba(232,160,32,0.06)]"
                      style={{ background: "#1a1e28", borderRadius: 8, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 22, color: "#e8eaf0", display: "block" }}>{m.value}</span>
                      <span style={{ fontSize: 11, color: "#8b909e" }}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Fight History */}
            {fights.length > 0 && (
              <div style={{ padding: "0 24px 16px" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4" style={{ color: "#e8a020" }} />
                  <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 16, color: "#e8eaf0" }}>Fight History</h3>
                </div>
                {fights.slice(0, 10).map((fight: any) => {
                  const isWin = fight.winner_id === fighterId || (fight.result === "win" && (fight.fighter_a_id === fighterId || fight.fighter_a_id === fight.fighter_b_id));
                  const isDraw = fight.result === "draw";
                  const resultLabel = isWin ? "Win" : isDraw ? "Draw" : "Loss";
                  const resultBg = isWin ? "#22c55e" : isDraw ? "#f59e0b" : "#ef4444";
                  const opponentName = fight.opponent_name || (fight.fighter_a_id === fighterId ? "Opponent" : "Opponent");
                  const evtName = Array.isArray(fight.events) ? fight.events[0]?.title : fight.events?.title;

                  return (
                    <div
                      key={fight.id}
                      className="flex items-center justify-between transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] cursor-pointer"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 8,
                        padding: "12px 16px",
                        marginBottom: 8,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          style={{
                            background: resultBg,
                            color: "white",
                            borderRadius: 6,
                            padding: "4px 12px",
                            fontFamily: "Inter, sans-serif",
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          {resultLabel}
                        </span>
                        <div>
                          <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#e8eaf0" }}>
                            vs {opponentName}
                          </p>
                          {fight.method && (
                            <p style={{ fontSize: 12, color: "#8b909e" }}>
                              {fight.method}{fight.round ? ` - Round ${fight.round}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {evtName && <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: "#e8eaf0" }}>{evtName}</p>}
                        {fight.event_date && <p style={{ fontSize: 12, color: "#8b909e" }}>{new Date(fight.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upcoming Events + Actions */}
            <div style={{ padding: "0 24px 24px" }}>
              {upcomingEvents.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4" style={{ color: "#e8a020" }} />
                    <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 16, color: "#e8eaf0" }}>Upcoming Events</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {upcomingEvents.map((evt: any) => (
                      <div
                        key={evt.id}
                        className="transition-all duration-200 hover:bg-[rgba(232,160,32,0.1)] hover:border-[rgba(232,160,32,0.35)]"
                        style={{ background: "rgba(232,160,32,0.06)", border: "1px solid rgba(232,160,32,0.2)", borderRadius: 8, padding: "14px 16px" }}
                      >
                        <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, color: "#e8eaf0", textTransform: "uppercase" }}>{evt.title}</p>
                        <p style={{ fontSize: 12, color: "#8b909e" }}>Scheduled to compete</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                {user && fighter?.user_id && user.id !== fighter.user_id && (
                  <button
                    onClick={toggleFollow}
                    onMouseEnter={() => setFollowHover(true)}
                    onMouseLeave={() => setFollowHover(false)}
                    className="flex-1 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
                    style={{
                      background: isFollowing ? (followHover ? "rgba(239,68,68,0.1)" : "rgba(232,160,32,0.12)") : "#e8a020",
                      border: isFollowing ? `1px solid ${followHover ? "rgba(239,68,68,0.4)" : "#e8a020"}` : "none",
                      color: isFollowing ? (followHover ? "#ef4444" : "#e8a020") : "#0d0f12",
                      borderRadius: 8,
                      padding: "10px 20px",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {isFollowing ? (followHover ? <><UserMinus className="h-4 w-4" /> Unfollow</> : <><Check className="h-4 w-4" /> Following</>) : "Follow Fighter"}
                  </button>
                )}
                <button
                  onClick={shareProfile}
                  className="flex-1 flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer hover:bg-[rgba(255,255,255,0.08)]"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#e8eaf0",
                    borderRadius: 8,
                    padding: "10px 20px",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  <Share2 className="h-4 w-4" /> Share Profile
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
