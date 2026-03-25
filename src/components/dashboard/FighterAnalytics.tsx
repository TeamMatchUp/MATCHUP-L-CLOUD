import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { formatEnum } from "@/lib/format";
import { Info, X } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  Legend,
} from "recharts";

// ── Design tokens from the reference HTML ──
const C = {
  bg: "#0d0f14",
  surface: "#13161e",
  surface2: "#1a1e28",
  border: "#252a38",
  gold: "#f0c040",
  goldDim: "#c09820",
  goldGlow: "rgba(240,192,64,0.12)",
  text: "#e8eaf0",
  muted: "#6b7280",
  loss: "#e05050",
  draw: "#4a8fb5",
  green: "#4ade80",
  purple: "#c084fc",
  orange: "#e8a020",
};

const headFont = "'Barlow Condensed', sans-serif";
const bodyFont = "'Barlow', sans-serif";

/* ── tiny reusable bits ── */
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3.5 mt-6 mb-3.5" style={{ fontFamily: headFont }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: C.muted, whiteSpace: "nowrap" }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function Toggle({ value, onChange, options = ["Pro", "Am", "All"] }: { value: string; onChange: (v: string) => void; options?: string[] }) {
  const keys = options.map((o) => o.toLowerCase().replace("amateur", "am"));
  return (
    <span style={{ display: "inline-flex", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 5, overflow: "hidden" }}>
      {options.map((label, i) => {
        const k = keys[i];
        const active = value === k;
        return (
          <button key={k} onClick={() => onChange(k)} style={{
            fontFamily: headFont, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
            background: active ? C.gold : "none", border: "none", color: active ? C.bg : C.muted,
            padding: "3px 9px", cursor: "pointer", transition: "all .15s",
          }}>{label}</button>
        );
      })}
    </span>
  );
}

function StatCardFA({ label, value, sub, toggle }: { label: string; value: string | number; sub?: string; toggle?: React.ReactNode }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: C.gold, opacity: 0.5 }} />
      <div style={{ fontFamily: headFont, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.muted, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        {label}{toggle}
      </div>
      <div style={{ fontFamily: headFont, fontSize: 32, fontWeight: 800, color: C.gold, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function InfoBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 18, height: 18, borderRadius: "50%", background: C.surface2,
      border: `1px solid ${C.border}`, color: C.muted, fontSize: 10, fontWeight: 700,
      cursor: "pointer", transition: "all .15s", flexShrink: 0,
    }}>?</button>
  );
}

const CustomTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, color: C.text }}>
      <p style={{ fontWeight: 600, marginBottom: 2 }}>{label}</p>
      {payload.map((p: any) => <p key={p.dataKey} style={{ color: p.fill || p.color || C.gold }}>{p.name}: {p.value}</p>)}
    </div>
  );
};

/* ── Popup modal ── */
function PopupModal({ open, title, body, onClose }: { open: boolean; title: string; body: React.ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "28px 30px", maxWidth: 520, width: "90%", position: "relative", maxHeight: "80vh", overflowY: "auto" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20 }}>
          <X size={18} />
        </button>
        <div style={{ fontFamily: headFont, fontSize: 20, fontWeight: 800, color: C.gold, marginBottom: 16, letterSpacing: 1 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{body}</div>
      </div>
    </div>
  );
}

/* ── helper: compute record from fights ── */
function computeRecord(fights: any[], fighterId: string, filter: string) {
  let filtered = fights;
  if (filter === "pro") filtered = fights.filter((f) => !f.is_amateur);
  else if (filter === "am") filtered = fights.filter((f) => f.is_amateur);

  const wins = filtered.filter((f) => f.result === "win" || f.winner_id === fighterId).length;
  const losses = filtered.filter((f) => f.result === "loss" || (f.winner_id && f.winner_id !== fighterId && f.result !== "draw")).length;
  const draws = filtered.filter((f) => f.result === "draw").length;
  const total = wins + losses + draws;
  const winPct = total > 0 ? Math.round((wins / total) * 100) : 0;

  const winFights = filtered.filter((f) => f.result === "win" || f.winner_id === fighterId);
  const koTko = winFights.filter((f) => { const m = (f.method || "").toLowerCase(); return m.includes("ko") || m.includes("tko"); }).length;
  const subs = winFights.filter((f) => (f.method || "").toLowerCase().includes("sub")).length;
  const decisions = wins - koTko - subs;
  const finishes = koTko + subs;
  const finishRate = wins > 0 ? Math.round((finishes / wins) * 100) : 0;
  const koRate = total > 0 ? Math.round((koTko / total) * 100) : 0;
  const subRate = total > 0 ? Math.round((subs / total) * 100) : 0;

  return { wins, losses, draws, total, winPct, koTko, subs, decisions, finishes, finishRate, koRate, subRate, winFights, filtered };
}

function computeStreak(fights: any[], fighterId: string, filter: string) {
  let sorted = [...fights].sort((a, b) => new Date(b.event_date || b.created_at).getTime() - new Date(a.event_date || a.created_at).getTime());
  if (filter === "pro") sorted = sorted.filter((f) => !f.is_amateur);
  else if (filter === "am") sorted = sorted.filter((f) => f.is_amateur);
  if (sorted.length === 0) return { current: 0, type: "none", best: 0 };

  const firstResult = sorted[0].result === "win" || sorted[0].winner_id === fighterId ? "win" : sorted[0].result === "draw" ? "draw" : "loss";
  let current = 0;
  for (const f of sorted) {
    const r = f.result === "win" || f.winner_id === fighterId ? "win" : f.result === "draw" ? "draw" : "loss";
    if (r === firstResult) current++;
    else break;
  }

  // Best win streak
  let best = 0, run = 0;
  for (const f of [...sorted].reverse()) {
    if (f.result === "win" || f.winner_id === fighterId) { run++; if (run > best) best = run; }
    else run = 0;
  }

  return { current, type: firstResult, best };
}

function computeLossMethods(fights: any[], fighterId: string, filter: string) {
  let filtered = fights;
  if (filter === "pro") filtered = fights.filter((f) => !f.is_amateur);
  else if (filter === "am") filtered = fights.filter((f) => f.is_amateur);

  const lossFights = filtered.filter((f) => f.result === "loss" || (f.winner_id && f.winner_id !== fighterId && f.result !== "draw"));
  const counts: Record<string, number> = { KO: 0, TKO: 0, Submission: 0, Decision: 0 };
  lossFights.forEach((f) => {
    const m = (f.method || "").toLowerCase();
    if (m.includes("sub")) counts.Submission++;
    else if (m.includes("tko")) counts.TKO++;
    else if (m.includes("ko")) counts.KO++;
    else counts.Decision++;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export function FighterAnalyticsV2({ fighterProfile }: { fighterProfile: any }) {
  const [statsFilter, setStatsFilter] = useState("pro");
  const [actFilter, setActFilter] = useState("pro");
  const [streakFilter, setStreakFilter] = useState("pro");
  const [splitFilter, setSplitFilter] = useState("pro");
  const [wmFilter, setWmFilter] = useState("pro");
  const [lmFilter, setLmFilter] = useState("pro");
  const [popup, setPopup] = useState<"elo" | "opp" | null>(null);

  // ── Queries ──
  const { data: fights = [] } = useQuery({
    queryKey: ["fa-fights", fighterProfile.id],
    queryFn: async () => {
      const { data } = await supabase.from("fights").select("*").or(`fighter_a_id.eq.${fighterProfile.id},fighter_b_id.eq.${fighterProfile.id}`).order("event_date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: allFighters = [] } = useQuery({
    queryKey: ["fa-all-fighters"],
    queryFn: async () => {
      const { data } = await supabase.from("fighter_profiles").select("id, name, weight_class, discipline, record_wins, record_losses, record_draws").eq("visibility", "public");
      return data ?? [];
    },
  });

  const { data: proposalCount = 0 } = useQuery({
    queryKey: ["fa-proposals", fighterProfile.id],
    queryFn: async () => {
      const { count } = await supabase.from("match_suggestions").select("*", { count: "exact", head: true }).or(`fighter_a_id.eq.${fighterProfile.id},fighter_b_id.eq.${fighterProfile.id}`);
      return count ?? 0;
    },
  });

  const { data: gymLinks = [] } = useQuery({
    queryKey: ["fa-gym-links", fighterProfile.id],
    queryFn: async () => {
      const { data } = await supabase.from("fighter_gym_links").select("status, gym_id").eq("fighter_id", fighterProfile.id);
      return data ?? [];
    },
  });

  // ── Derived data ──
  const rec = useMemo(() => computeRecord(fights, fighterProfile.id, statsFilter), [fights, fighterProfile.id, statsFilter]);
  const proRec = useMemo(() => computeRecord(fights, fighterProfile.id, "pro"), [fights, fighterProfile.id]);
  const amRec = useMemo(() => computeRecord(fights, fighterProfile.id, "am"), [fights, fighterProfile.id]);
  const allRec = useMemo(() => computeRecord(fights, fighterProfile.id, "all"), [fights, fighterProfile.id]);
  const streak = useMemo(() => computeStreak(fights, fighterProfile.id, streakFilter), [fights, fighterProfile.id, streakFilter]);
  const streakRec = useMemo(() => computeRecord(fights, fighterProfile.id, streakFilter), [fights, fighterProfile.id, streakFilter]);

  // Split doughnut
  const splitRec = useMemo(() => computeRecord(fights, fighterProfile.id, splitFilter), [fights, fighterProfile.id, splitFilter]);
  const splitData = [
    { name: "Wins", value: splitRec.wins, color: C.gold },
    { name: "Losses", value: splitRec.losses, color: C.loss },
    { name: "Draws", value: splitRec.draws, color: C.draw },
  ].filter((d) => d.value > 0);

  // Win method doughnut
  const wmRec = useMemo(() => computeRecord(fights, fighterProfile.id, wmFilter), [fights, fighterProfile.id, wmFilter]);
  const wmData = [
    { name: "KO", value: wmRec.koTko, color: C.gold },
    { name: "TKO", value: 0, color: C.orange }, // grouped with KO in computeRecord
    { name: "Submission", value: wmRec.subs, color: C.purple },
    { name: "Decision", value: wmRec.decisions, color: C.draw },
  ].filter((d) => d.value > 0);
  // Actually recompute win methods properly
  const winMethodData = useMemo(() => {
    let filtered = fights;
    if (wmFilter === "pro") filtered = fights.filter((f) => !f.is_amateur);
    else if (wmFilter === "am") filtered = fights.filter((f) => f.is_amateur);
    const winFights = filtered.filter((f) => f.result === "win" || f.winner_id === fighterProfile.id);
    const counts: Record<string, number> = { KO: 0, TKO: 0, Submission: 0, Decision: 0 };
    winFights.forEach((f) => {
      const m = (f.method || "").toLowerCase();
      if (m.includes("tko")) counts.TKO++;
      else if (m.includes("ko")) counts.KO++;
      else if (m.includes("sub")) counts.Submission++;
      else counts.Decision++;
    });
    return [
      { name: "KO", value: counts.KO, color: C.gold },
      { name: "TKO", value: counts.TKO, color: C.orange },
      { name: "Submission", value: counts.Submission, color: C.purple },
      { name: "Decision", value: counts.Decision, color: C.draw },
    ].filter((d) => d.value > 0);
  }, [fights, fighterProfile.id, wmFilter]);

  // Loss method doughnut
  const lossMethodData = useMemo(() => computeLossMethods(fights, fighterProfile.id, lmFilter), [fights, fighterProfile.id, lmFilter]);
  const lossMethodColors = ["#c03030", "#a02020", "#802020", C.draw];

  // Activity timeline
  const activityData = useMemo(() => {
    let filtered = fights;
    if (actFilter === "pro") filtered = fights.filter((f) => !f.is_amateur);
    else if (actFilter === "am") filtered = fights.filter((f) => f.is_amateur);
    const years: Record<string, number> = {};
    filtered.forEach((f) => {
      const y = f.event_date ? new Date(f.event_date).getFullYear().toString() : "Unknown";
      years[y] = (years[y] || 0) + 1;
    });
    return Object.entries(years).sort(([a], [b]) => a.localeCompare(b)).map(([year, count]) => ({ year, Fights: count }));
  }, [fights, actFilter]);

  // Ranking
  const ranking = useMemo(() => {
    const sameWeightDisc = allFighters.filter((f) => f.weight_class === fighterProfile.weight_class && f.discipline === fighterProfile.discipline);
    const sorted = sameWeightDisc.map((f) => ({
      ...f,
      totalProWins: f.record_wins || 0,
    })).sort((a, b) => b.totalProWins - a.totalProWins);
    const rank = sorted.findIndex((f) => f.id === fighterProfile.id) + 1;
    return { rank, total: sorted.length };
  }, [allFighters, fighterProfile]);

  // Elo placeholder
  const elo = 1000 + (proRec.wins * 100) - (proRec.losses * 50);

  // Profile completeness
  const profileFields = useMemo(() => {
    const fp = fighterProfile;
    const hasFight = fights.length > 0;
    const hasGym = gymLinks.some((l: any) => l.status === "approved");
    return [
      { label: "Basic info (name, DOB, weight class, discipline)", complete: !!(fp.name && fp.date_of_birth && fp.weight_class && fp.discipline) },
      { label: "Physical stats (height, reach, stance, weight)", complete: !!(fp.height && fp.reach && fp.stance && fp.walk_around_weight_kg) },
      { label: "Fight record", complete: hasFight },
      { label: "Training (background, years)", complete: !!(fp.training_background && fp.years_training) },
      { label: "Gym affiliation", complete: hasGym },
      { label: "Profile photo", complete: !!fp.profile_image },
      { label: "Fighting substyle", complete: !!fp.fighting_substyle },
    ];
  }, [fighterProfile, fights, gymLinks]);
  const completePct = Math.round((profileFields.filter((f) => f.complete).length / profileFields.length) * 100);

  // Opponent quality: % with .500+ record
  const opp500 = useMemo(() => {
    const opponentIds = fights.filter((f) => f.fighter_b_id && f.fighter_b_id !== fighterProfile.id).map((f) => f.fighter_b_id)
      .concat(fights.filter((f) => f.fighter_a_id !== fighterProfile.id).map((f) => f.fighter_a_id));
    const uniqueIds = [...new Set(opponentIds)].filter(Boolean);
    if (uniqueIds.length === 0) return 0;
    const oppProfiles = allFighters.filter((f) => uniqueIds.includes(f.id));
    const above500 = oppProfiles.filter((f) => {
      const total = (f.record_wins || 0) + (f.record_losses || 0);
      return total > 0 && (f.record_wins || 0) / total >= 0.5;
    });
    return oppProfiles.length > 0 ? Math.round((above500.length / oppProfiles.length) * 100) : 0;
  }, [fights, fighterProfile.id, allFighters]);

  // Weight class history
  const wcHistory = useMemo(() => {
    // Group fights by weight_class (from fighter_profiles current — we don't have per-fight weight stored, so use current)
    // This is a simplification; ideally each fight would store the weight class
    return [{ weightClass: fighterProfile.weight_class, record: `${proRec.wins}W – ${proRec.losses}L – ${proRec.draws}D (pro)`, period: "Current", current: true }];
  }, [fighterProfile, proRec]);

  return (
    <div style={{ fontFamily: bodyFont, color: C.text }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: headFont, fontSize: 34, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
          Fighter <span style={{ color: C.gold }}>analytics</span>
        </h2>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
          {formatEnum(fighterProfile.weight_class)} · {fighterProfile.discipline || "—"} · {fighterProfile.stance || "—"} · #{ranking.rank || "—"} {fighterProfile.country || "UK"}
        </div>
      </div>

      {/* ── S1: Record overview ── */}
      <SectionHeader title="Record overview" />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <RecordPill label="Pro record" w={proRec.wins} l={proRec.losses} d={proRec.draws} />
        <RecordPill label="Amateur record" w={amRec.wins} l={amRec.losses} d={amRec.draws} />
        <RecordPill label="Combined" w={allRec.wins} l={allRec.losses} d={allRec.draws} />
        <RecordPillText label="Weight class" value={formatEnum(fighterProfile.weight_class)} />
        <RecordPillText label="Discipline" value={`${fighterProfile.discipline || "—"} · ${fighterProfile.stance || "—"}`} />
        <RecordPillText label="Years training" value={fighterProfile.years_training?.toString() || "—"} />
      </div>

      {/* ── S2: Career stats ── */}
      <SectionHeader title="Career stats" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 12 }} className="fa-g6">
        <StatCardFA label="Total fights" value={rec.total} sub={`${statsFilter === "pro" ? "Pro" : statsFilter === "am" ? "Amateur" : "All"} career fights`} toggle={<Toggle value={statsFilter} onChange={setStatsFilter} />} />
        <StatCardFA label="Win rate" value={`${rec.winPct}%`} sub={`${rec.wins}W of ${rec.total} fights`} toggle={<Toggle value={statsFilter} onChange={setStatsFilter} />} />
        <StatCardFA label="Finish rate" value={`${rec.finishRate}%`} sub={`${rec.koTko} KO/TKO · ${rec.subs} Sub`} toggle={<Toggle value={statsFilter} onChange={setStatsFilter} />} />
        <StatCardFA label="KO/TKO rate" value={`${rec.koRate}%`} sub={`${rec.koTko} of ${rec.total} by KO/TKO`} toggle={<Toggle value={statsFilter} onChange={setStatsFilter} />} />
        <StatCardFA label="Sub rate" value={`${rec.subRate}%`} sub={`${rec.subs} by submission`} toggle={<Toggle value={statsFilter} onChange={setStatsFilter} />} />
        <StatCardFA label="Elo rating" value={elo.toLocaleString()} sub={`${formatEnum(fighterProfile.weight_class)} · #${ranking.rank || "—"}`} />
      </div>

      {/* ── S3: Market demand ── */}
      <SectionHeader title="Market demand & visibility" />
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 22px", marginBottom: 12 }}>
        <div style={{ fontFamily: headFont, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.muted, marginBottom: 14 }}>
          How much interest your profile is generating from promoters and coaches on the platform
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
          <DemandItem value={0} label="Profile views – Last 30d" sub="Tracking coming soon" align="left" />
          <DemandItem value={proposalCount} label="Fight proposals received" sub="From match suggestions" />
          <DemandItem value={0} label="Total profile views (all time)" sub="Platform-wide reach" noBorder />
        </div>
      </div>

      {/* ── S4: Fight performance analytics ── */}
      <SectionHeader title="Fight performance analytics" />

      {/* Row 1: Activity timeline + Streak */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12, marginBottom: 12 }} className="fa-g32">
        {/* Activity timeline */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 22px" }}>
          <div style={{ fontFamily: headFont, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.text, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
            Fight activity timeline
            <Toggle value={actFilter} onChange={setActFilter} options={["Pro", "Amateur", "All"]} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activityData}>
              <XAxis dataKey="year" tick={{ fill: C.muted, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
              <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTip />} />
              <Bar dataKey="Fights" fill={C.gold} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Streak tracker */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 22px" }}>
          <div style={{ fontFamily: headFont, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.text, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
            Streak tracker
            <Toggle value={streakFilter} onChange={setStreakFilter} options={["Pro", "Amateur", "All"]} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: headFont, fontSize: 52, fontWeight: 800, color: C.gold, lineHeight: 1 }}>{streak.current}</div>
              <div style={{ fontFamily: headFont, fontSize: 14, fontWeight: 700, color: C.text, marginTop: 4 }}>
                {streak.type === "win" ? "🔥 Win streak" : streak.type === "loss" ? "📉 Loss streak" : streak.type === "draw" ? "Draw streak" : "No fights"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: headFont, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: C.muted }}>Career best</div>
              <div style={{ fontFamily: headFont, fontSize: 20, fontWeight: 800, color: C.muted, marginTop: 2 }}>{streak.best}W</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <StreakBox value={streakRec.wins} label="Wins" color={C.gold} />
            <StreakBox value={streakRec.losses} label="Losses" color={C.loss} />
            <StreakBox value={streakRec.draws} label="Draws" color={C.draw} />
            <StreakBox value={`${streakRec.finishRate}%`} label="Finish rate" color={C.green} />
          </div>
        </div>
      </div>

      {/* Row 2: Three doughnuts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }} className="fa-g3">
        <DoughnutCard title="W / L / D split" data={splitData} filter={splitFilter} onFilter={setSplitFilter} />
        <DoughnutCard title="Win method breakdown" data={winMethodData} filter={wmFilter} onFilter={setWmFilter} />
        <DoughnutCard title="Loss method breakdown" data={lossMethodData.map((d, i) => ({ ...d, color: lossMethodColors[i] || C.draw }))} filter={lmFilter} onFilter={setLmFilter} />
      </div>

      {/* ── S5: Rankings & Elo ── */}
      <SectionHeader title="Rankings & Elo" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 12, marginBottom: 12 }} className="fa-g13">
        {/* Rank card */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div style={{ fontFamily: headFont, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.muted }}>
            {formatEnum(fighterProfile.weight_class)} ranking
          </div>
          <div style={{ fontFamily: headFont, fontSize: 68, fontWeight: 800, color: C.gold, lineHeight: 1, textShadow: "0 0 40px rgba(240,192,64,.3)" }}>
            #{ranking.rank || "—"}
          </div>
          <div style={{ fontFamily: headFont, fontSize: 15, fontWeight: 700, marginTop: 8 }}>{fighterProfile.country || "United Kingdom"}</div>
          <div style={{ width: 36, height: 1, background: C.border, margin: "12px auto" }} />
          <div style={{ fontFamily: headFont, fontSize: 22, fontWeight: 700 }}>{elo.toLocaleString()}</div>
          <div style={{ fontFamily: headFont, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: C.muted }}>Elo rating</div>
        </div>

        {/* Elo breakdown */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 22px" }}>
          <div style={{ fontFamily: headFont, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.text, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            How your Elo is calculated
            <InfoBtn onClick={() => setPopup("elo")} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <EloRow label="Opponent quality" sub="Beating a higher-rated opponent yields more points." weight="×1.4" />
            <EloRow label="Method of victory" sub="Finishes (KO, TKO, Sub) weighted higher than decisions." weight="×1.2" />
            <EloRow label="Recency weighting" sub="Recent fights carry more weight. Rating decays with inactivity." weight="×1.1" />
            <EloRow label="Win / loss margin" sub="Unanimous decisions score higher than split decisions." weight="×1.0" />
          </div>
        </div>
      </div>

      {/* ── S6: Career history ── */}
      <SectionHeader title="Career history" />
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12, marginBottom: 12 }} className="fa-g32">
        {/* Fight table */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 22px" }}>
          <div style={{ fontFamily: headFont, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.text, marginBottom: 14 }}>
            Recent fight history
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Result", "Opponent", "Method", "Round", "Event", "Date"].map((h) => (
                  <th key={h} style={{ fontFamily: headFont, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase", color: C.muted, padding: "0 8px 10px", textAlign: "left", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fights.slice(0, 10).map((f) => {
                const isWin = f.result === "win" || f.winner_id === fighterProfile.id;
                const isDraw = f.result === "draw";
                const resultLabel = isWin ? "W" : isDraw ? "D" : "L";
                const pillBg = isWin ? C.goldGlow : isDraw ? "rgba(74,143,181,.1)" : "rgba(224,80,80,.1)";
                const pillColor = isWin ? C.gold : isDraw ? C.draw : C.loss;
                const pillBorder = isWin ? C.goldDim : isDraw ? "rgba(74,143,181,.3)" : "rgba(224,80,80,.3)";
                return (
                  <tr key={f.id}>
                    <td style={{ padding: "9px 8px", fontSize: 13, borderBottom: `1px solid ${C.border}40` }}>
                      <span style={{ fontFamily: headFont, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 3, background: pillBg, color: pillColor, border: `1px solid ${pillBorder}` }}>{resultLabel}</span>
                    </td>
                    <td style={{ padding: "9px 8px", fontSize: 13, borderBottom: `1px solid ${C.border}40` }}>{f.opponent_name || "Unknown"}</td>
                    <td style={{ padding: "9px 8px", fontSize: 13, borderBottom: `1px solid ${C.border}40` }}>{f.method || "—"}{f.round ? ` R${f.round}` : ""}</td>
                    <td style={{ padding: "9px 8px", fontSize: 13, borderBottom: `1px solid ${C.border}40`, color: C.muted }}>{f.round || "—"}</td>
                    <td style={{ padding: "9px 8px", fontSize: 13, borderBottom: `1px solid ${C.border}40` }}>{f.event_name || "—"}</td>
                    <td style={{ padding: "9px 8px", fontSize: 11, borderBottom: `1px solid ${C.border}40`, color: C.muted }}>{f.event_date ? new Date(f.event_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—"}</td>
                  </tr>
                );
              })}
              {fights.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: C.muted, fontSize: 13 }}>No fights recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Weight class timeline */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 22px" }}>
          <div style={{ fontFamily: headFont, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.text, marginBottom: 14 }}>
            Weight class history
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {wcHistory.map((wc, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0" }}>
                <div style={{ fontFamily: headFont, fontSize: 11, letterSpacing: 1, color: C.muted, minWidth: 52, paddingTop: 2 }}>{wc.period}</div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                    background: wc.current ? C.gold : C.surface2,
                    border: `2px solid ${wc.current ? C.gold : C.border}`,
                    boxShadow: wc.current ? `0 0 10px rgba(240,192,64,.5)` : "none",
                  }} />
                  {i < wcHistory.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 18, background: C.border }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 4 }}>
                  <div style={{ fontFamily: headFont, fontSize: 14, fontWeight: 700 }}>
                    {formatEnum(wc.weightClass)}
                    {wc.current && <span style={{ fontFamily: headFont, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: C.gold, background: C.goldGlow, border: "1px solid rgba(240,192,64,.2)", padding: "1px 6px", borderRadius: 10, marginLeft: 8 }}>CURRENT</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{wc.record}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── S7: Opponent record quality ── */}
      <SectionHeader title="Opponent record quality" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }} className="fa-g2">
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 22px" }}>
          <div style={{ fontFamily: headFont, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.text, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            Strength of schedule
            <InfoBtn onClick={() => setPopup("opp")} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <OppCell value="—" label="Avg opp quality score" />
            <OppCell value="—" label="Avg opp Elo at fight date" />
            <OppCell value={`${opp500}%`} label="Opps with .500+ record" />
            <OppCell value="—" label="Ranked opponents beaten" />
          </div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 22px" }}>
          <div style={{ fontFamily: headFont, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.text, marginBottom: 14 }}>
            Opponent Elo at fight date
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 150, color: C.muted, fontSize: 12 }}>
            Data available when Elo tracking is enabled
          </div>
        </div>
      </div>

      {/* ── S8: Profile completeness ── */}
      <SectionHeader title="Profile completeness" />
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 22px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 18 }}>
          {/* Ring */}
          <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
            <svg width={80} height={80} viewBox="0 0 80 80">
              <circle cx={40} cy={40} r={34} fill="none" stroke={C.surface2} strokeWidth={6} />
              <circle cx={40} cy={40} r={34} fill="none" stroke={C.gold} strokeWidth={6}
                strokeDasharray={`${(completePct / 100) * 213.6} 213.6`}
                strokeLinecap="round" transform="rotate(-90 40 40)" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: headFont, fontSize: 20, fontWeight: 800, color: C.gold }}>
              {completePct}%
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: headFont, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Profile is {completePct}% complete</div>
            <div style={{ fontSize: 12, color: C.muted }}>A complete profile ranks higher in matchmaking suggestions and generates more proposals.</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {profileFields.map((field) => (
            <div key={field.label}>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: headFont, letterSpacing: 1, textTransform: "uppercase", display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>{field.label}</span>
                <span style={{ color: field.complete ? C.text : C.muted }}>{field.complete ? "✓ Complete" : "Incomplete"}</span>
              </div>
              <div style={{ background: C.surface2, borderRadius: 3, height: 5, overflow: "hidden" }}>
                <div style={{ height: "100%", background: field.complete ? C.gold : C.border, borderRadius: 3, width: field.complete ? "100%" : "0%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Popup modals ── */}
      <PopupModal open={popup === "elo"} onClose={() => setPopup(null)} title="How your Elo rating is calculated" body={
        <div>
          <p style={{ marginBottom: 10 }}>Your Elo rating is a dynamic score that reflects the strength of your professional combat record. It is used by the matchmaking algorithm to pair you with appropriately matched opponents and determine your weight class ranking.</p>
          <p style={{ fontFamily: headFont, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.muted, margin: "14px 0 6px" }}>Inputs & weighting</p>
          <ul style={{ paddingLeft: 18 }}>
            <li style={{ marginBottom: 6 }}><strong style={{ color: C.gold }}>Opponent quality (×1.4 weight):</strong> The most important factor. Beating a higher-rated opponent earns significantly more points.</li>
            <li style={{ marginBottom: 6 }}><strong style={{ color: C.gold }}>Method of victory (×1.2 weight):</strong> Finishing your opponent by KO, TKO, or Submission scores higher than a Decision win.</li>
            <li style={{ marginBottom: 6 }}><strong style={{ color: C.gold }}>Recency (×1.1 weight):</strong> More recent fights carry more weight. Your rating decays slightly if inactive for more than 12 months.</li>
            <li style={{ marginBottom: 6 }}><strong style={{ color: C.gold }}>Decision margin (×1.0 weight):</strong> A unanimous decision win scores higher than a split decision.</li>
          </ul>
          <p style={{ fontFamily: headFont, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.muted, margin: "14px 0 6px" }}>How it affects you</p>
          <p>Your Elo rating directly determines your weight class ranking and how you appear in algorithmic matchmaking suggestions to event organisers.</p>
        </div>
      } />
      <PopupModal open={popup === "opp"} onClose={() => setPopup(null)} title="Opponent record quality — what it means" body={
        <div>
          <p style={{ marginBottom: 10 }}>The Opponent Record Quality section measures the <strong style={{ color: C.gold }}>strength of your schedule</strong> — how formidable your past opponents were when you fought them.</p>
          <p style={{ marginBottom: 10 }}>A fighter with a 10-0 record who faced ten 0-0 opponents is very different from a fighter with a 10-0 record who beat ten ranked competitors.</p>
          <p style={{ fontFamily: headFont, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.muted, margin: "14px 0 6px" }}>What each metric means</p>
          <ul style={{ paddingLeft: 18 }}>
            <li style={{ marginBottom: 6 }}><strong style={{ color: C.gold }}>Avg opponent quality score:</strong> A composite score (0–10) based on opponent Elo, record, and finish rate at time of fight.</li>
            <li style={{ marginBottom: 6 }}><strong style={{ color: C.gold }}>Avg opponent Elo at fight date:</strong> The average Elo of every opponent at the time of your fight.</li>
            <li style={{ marginBottom: 6 }}><strong style={{ color: C.gold }}>Opponents with .500+ record:</strong> The percentage of opponents who had at least as many wins as losses when you fought them.</li>
            <li style={{ marginBottom: 6 }}><strong style={{ color: C.gold }}>Ranked opponents beaten:</strong> The number of nationally ranked opponents you have defeated.</li>
          </ul>
        </div>
      } />

      {/* Responsive CSS overrides */}
      <style>{`
        @media (max-width: 900px) {
          .fa-g6 { grid-template-columns: repeat(3, 1fr) !important; }
          .fa-g32 { grid-template-columns: 1fr !important; }
          .fa-g13 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .fa-g6 { grid-template-columns: repeat(2, 1fr) !important; }
          .fa-g3 { grid-template-columns: 1fr !important; }
          .fa-g2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Sub-components ── */
function RecordPill({ label, w, l, d }: { label: string; w: number; l: number; d: number }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 16px" }}>
      <div style={{ fontFamily: headFont, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase", color: C.muted, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: headFont, fontSize: 16, fontWeight: 800 }}>
        <span style={{ color: C.gold }}>{w}</span>W – <span style={{ color: C.loss }}>{l}</span>L – <span style={{ color: C.draw }}>{d}</span>D
      </div>
    </div>
  );
}

function RecordPillText({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 16px" }}>
      <div style={{ fontFamily: headFont, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase", color: C.muted, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: headFont, fontSize: 15, fontWeight: 800, color: C.text }}>{value}</div>
    </div>
  );
}

function DemandItem({ value, label, sub, align = "center", noBorder = false }: { value: number; label: string; sub: string; align?: string; noBorder?: boolean }) {
  return (
    <div style={{ padding: "0 20px", borderRight: noBorder ? "none" : `1px solid ${C.border}`, textAlign: align as any }}>
      <div style={{ fontFamily: headFont, fontSize: 36, fontWeight: 800, color: C.gold, lineHeight: 1 }}>{value.toLocaleString()}</div>
      <div style={{ fontFamily: headFont, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: C.muted, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{sub}</div>
    </div>
  );
}

function StreakBox({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div style={{ background: C.surface2, borderRadius: 5, padding: "8px 12px", textAlign: "center", flex: 1 }}>
      <div style={{ fontFamily: headFont, fontSize: 20, fontWeight: 800, lineHeight: 1, color }}>{value}</div>
      <div style={{ fontFamily: headFont, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: C.muted, marginTop: 3 }}>{label}</div>
    </div>
  );
}

function DoughnutCard({ title, data, filter, onFilter }: { title: string; data: { name: string; value: number; color: string }[]; filter: string; onFilter: (v: string) => void }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 22px", display: "flex", flexDirection: "column" }}>
      <div style={{ fontFamily: headFont, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.text, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        {title}
        <Toggle value={filter} onChange={onFilter} />
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {data.length > 0 && data.some((d) => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke={C.surface} strokeWidth={3}>
                {data.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip content={<CustomTip />} />
              <Legend formatter={(v) => <span style={{ fontSize: 11, color: C.text }}>{v}</span>} iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: C.muted, fontSize: 12, padding: 20 }}>No data</p>
        )}
      </div>
    </div>
  );
}

function EloRow({ label, sub, weight }: { label: string; sub: string; weight: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface2, borderRadius: 5, padding: "8px 12px" }}>
      <div>
        <div style={{ fontFamily: headFont, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: C.text }}>{label}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{sub}</div>
      </div>
      <div style={{ fontFamily: headFont, fontSize: 14, fontWeight: 800, color: C.gold, flexShrink: 0, marginLeft: 12 }}>{weight}</div>
    </div>
  );
}

function OppCell({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ background: C.surface2, borderRadius: 6, padding: 12, textAlign: "center" }}>
      <div style={{ fontFamily: headFont, fontSize: 26, fontWeight: 800, color: C.gold, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: headFont, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: C.muted, marginTop: 3 }}>{label}</div>
    </div>
  );
}
