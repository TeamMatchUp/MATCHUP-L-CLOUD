import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { formatEnum } from "@/lib/format";
import { X, ChevronDown } from "lucide-react";
import { useCollapsibleSections } from "@/hooks/use-collapsible-sections";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  Legend,
} from "recharts";

/* ── tiny reusable bits ── */
function SectionHeader({ title, collapsed, onToggle }: { title: string; collapsed?: boolean; onToggle?: () => void }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-3.5 mt-6 mb-3.5 w-full text-left group cursor-pointer">
      <span className="font-heading text-sm font-bold tracking-[2.5px] uppercase text-muted-foreground whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-border" />
      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${collapsed ? "-rotate-180" : ""}`} />
    </button>
  );
}

function Toggle({ value, onChange, options = ["Pro", "Am", "All"] }: { value: string; onChange: (v: string) => void; options?: string[] }) {
  const keys = options.map((o) => o.toLowerCase().replace("amateur", "am"));
  return (
    <span className="inline-flex bg-accent border border-border rounded-[5px] overflow-hidden">
      {options.map((label, i) => {
        const k = keys[i];
        const active = value === k;
        return (
          <button key={k} onClick={() => onChange(k)} className={`font-heading text-[10px] font-bold tracking-[1px] uppercase border-none px-2.5 py-[3px] cursor-pointer transition-all duration-150 ${active ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground"}`}>{label}</button>
        );
      })}
    </span>
  );
}

function StatCardFA({ label, value, sub, toggle }: { label: string; value: string | number; sub?: string; toggle?: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary opacity-50" />
      <div className="font-heading text-[10px] font-bold tracking-[1.5px] uppercase text-muted-foreground flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
        {label}{toggle}
      </div>
      <div className="font-heading text-[32px] font-extrabold text-primary leading-none">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function InfoBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-accent border border-border text-muted-foreground text-[10px] font-bold cursor-pointer transition-all duration-150 shrink-0">?</button>
  );
}

const CustomTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-2 text-xs text-foreground shadow-lg">
      <p className="font-semibold mb-0.5">{label}</p>
      {payload.map((p: any) => <p key={p.dataKey} style={{ color: p.fill || p.color || "hsl(var(--primary))" }}>{p.name}: {p.value}</p>)}
    </div>
  );
};

/* ── Popup modal ── */
function PopupModal({ open, title, body, onClose }: { open: boolean; title: string; body: React.ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} className="fixed inset-0 bg-black/75 z-[1000] flex items-center justify-center">
      <div className="bg-card border border-border rounded-[10px] p-7 max-w-[520px] w-[90%] relative max-h-[80vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-3.5 right-4 bg-transparent border-none text-muted-foreground cursor-pointer">
          <X size={18} />
        </button>
        <div className="font-heading text-xl font-extrabold text-primary mb-4 tracking-[1px]">{title}</div>
        <div className="text-[13px] text-foreground leading-[1.7]">{body}</div>
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
  const { toggle, isCollapsed } = useCollapsibleSections("fighter-analytics");

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

  const splitRec = useMemo(() => computeRecord(fights, fighterProfile.id, splitFilter), [fights, fighterProfile.id, splitFilter]);
  const splitData = [
    { name: "Wins", value: splitRec.wins, color: "hsl(var(--primary))" },
    { name: "Losses", value: splitRec.losses, color: "hsl(var(--destructive))" },
    { name: "Draws", value: splitRec.draws, color: "hsl(var(--secondary))" },
  ].filter((d) => d.value > 0);

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
      { name: "KO", value: counts.KO, color: "hsl(var(--primary))" },
      { name: "TKO", value: counts.TKO, color: "hsl(var(--ring))" },
      { name: "Submission", value: counts.Submission, color: "hsl(var(--secondary))" },
      { name: "Decision", value: counts.Decision, color: "hsl(var(--muted-foreground))" },
    ].filter((d) => d.value > 0);
  }, [fights, fighterProfile.id, wmFilter]);

  const lossMethodData = useMemo(() => computeLossMethods(fights, fighterProfile.id, lmFilter), [fights, fighterProfile.id, lmFilter]);
  const lossMethodColors = ["hsl(var(--destructive))", "hsl(0 72% 40%)", "hsl(0 60% 35%)", "hsl(var(--muted-foreground))"];

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

  const ranking = useMemo(() => {
    const sameWeightDisc = allFighters.filter((f) => f.weight_class === fighterProfile.weight_class && f.discipline === fighterProfile.discipline);
    const sorted = sameWeightDisc.map((f) => ({
      ...f,
      totalProWins: f.record_wins || 0,
    })).sort((a, b) => b.totalProWins - a.totalProWins);
    const rank = sorted.findIndex((f) => f.id === fighterProfile.id) + 1;
    return { rank, total: sorted.length };
  }, [allFighters, fighterProfile]);

  const elo = 1000 + (proRec.wins * 100) - (proRec.losses * 50);

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

  const wcHistory = useMemo(() => {
    return [{ weightClass: fighterProfile.weight_class, record: `${proRec.wins}W – ${proRec.losses}L – ${proRec.draws}D (pro)`, period: "Current", current: true }];
  }, [fighterProfile, proRec]);

  const chartAxisColor = "hsl(var(--muted-foreground))";
  const chartBorderColor = "hsl(var(--border))";
  const chartGoldColor = "hsl(var(--primary))";

  return (
    <div className="font-body text-foreground">
      {/* Subtitle */}
      <div className="text-sm text-muted-foreground mb-6">
        {formatEnum(fighterProfile.weight_class)} · {fighterProfile.discipline || "—"} · {fighterProfile.stance || "—"} · #{ranking.rank || "—"} {fighterProfile.country || "UK"}
      </div>

      {/* ── S1: Record overview ── */}
      <SectionHeader title="Record overview" collapsed={isCollapsed("record")} onToggle={() => toggle("record")} />
      {!isCollapsed("record") && <>
      <div className="flex gap-2.5 flex-wrap mb-3">
        <RecordPill label="Pro record" w={proRec.wins} l={proRec.losses} d={proRec.draws} />
        <RecordPill label="Amateur record" w={amRec.wins} l={amRec.losses} d={amRec.draws} />
        <RecordPill label="Combined" w={allRec.wins} l={allRec.losses} d={allRec.draws} />
        <RecordPillText label="Weight class" value={formatEnum(fighterProfile.weight_class)} />
        <RecordPillText label="Discipline" value={`${fighterProfile.discipline || "—"} · ${fighterProfile.stance || "—"}`} />
        <RecordPillText label="Years training" value={fighterProfile.years_training?.toString() || "—"} />
      </div>

      </>}

      {/* ── S2: Career stats ── */}
      <SectionHeader title="Career stats" collapsed={isCollapsed("career")} onToggle={() => toggle("career")} />
      {!isCollapsed("career") && <>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-3">
        <StatCardFA label="Total fights" value={rec.total} sub={`${statsFilter === "pro" ? "Pro" : statsFilter === "am" ? "Amateur" : "All"} career fights`} toggle={<Toggle value={statsFilter} onChange={setStatsFilter} />} />
        <StatCardFA label="Win rate" value={`${rec.winPct}%`} sub={`${rec.wins}W of ${rec.total} fights`} toggle={<Toggle value={statsFilter} onChange={setStatsFilter} />} />
        <StatCardFA label="Finish rate" value={`${rec.finishRate}%`} sub={`${rec.koTko} KO/TKO · ${rec.subs} Sub`} toggle={<Toggle value={statsFilter} onChange={setStatsFilter} />} />
        <StatCardFA label="KO/TKO rate" value={`${rec.koRate}%`} sub={`${rec.koTko} of ${rec.total} by KO/TKO`} toggle={<Toggle value={statsFilter} onChange={setStatsFilter} />} />
        <StatCardFA label="Sub rate" value={`${rec.subRate}%`} sub={`${rec.subs} by submission`} toggle={<Toggle value={statsFilter} onChange={setStatsFilter} />} />
        <StatCardFA label="Elo rating" value={elo.toLocaleString()} sub={`${formatEnum(fighterProfile.weight_class)} · #${ranking.rank || "—"}`} />
      </div>

      </>}

      {/* ── S3: Market demand ── */}
      <SectionHeader title="Market demand & visibility" collapsed={isCollapsed("demand")} onToggle={() => toggle("demand")} />
      {!isCollapsed("demand") && <>
      <div className="bg-card border border-border rounded-lg p-5 mb-3">
        <div className="font-heading text-[11px] font-bold tracking-[1.5px] uppercase text-muted-foreground mb-3.5">
          How much interest your profile is generating from promoters and coaches on the platform
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <DemandItem value={0} label="Profile views – Last 30d" sub="Tracking coming soon" />
          <DemandItem value={proposalCount} label="Fight proposals received" sub="From match suggestions" />
          <DemandItem value={0} label="Total profile views (all time)" sub="Platform-wide reach" />
        </div>
      </div>

      {/* ── S4: Fight performance analytics ── */}
      <SectionHeader title="Fight performance analytics" />

      {/* Row 1: Activity timeline + Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-3 mb-3">
        {/* Activity timeline */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="font-heading text-[13px] font-bold tracking-[1.5px] uppercase text-foreground mb-3.5 flex items-center justify-between flex-wrap gap-1.5">
            Fight activity timeline
            <Toggle value={actFilter} onChange={setActFilter} options={["Pro", "Amateur", "All"]} />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activityData}>
              <XAxis dataKey="year" tick={{ fill: chartAxisColor, fontSize: 11 }} axisLine={{ stroke: chartBorderColor }} tickLine={false} />
              <YAxis tick={{ fill: chartAxisColor, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTip />} />
              <Bar dataKey="Fights" fill={chartGoldColor} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Streak tracker */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="font-heading text-[13px] font-bold tracking-[1.5px] uppercase text-foreground mb-3.5 flex items-center justify-between flex-wrap gap-1.5">
            Streak tracker
            <Toggle value={streakFilter} onChange={setStreakFilter} options={["Pro", "Amateur", "All"]} />
          </div>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="font-heading text-[52px] font-extrabold text-primary leading-none">{streak.current}</div>
              <div className="font-heading text-sm font-bold text-foreground mt-1">
                {streak.type === "win" ? "🔥 Win streak" : streak.type === "loss" ? "📉 Loss streak" : streak.type === "draw" ? "Draw streak" : "No fights"}
              </div>
            </div>
            <div className="text-right">
              <div className="font-heading text-[11px] tracking-[1px] uppercase text-muted-foreground">Career best</div>
              <div className="font-heading text-xl font-extrabold text-muted-foreground mt-0.5">{streak.best}W</div>
            </div>
          </div>
          <div className="flex gap-2.5">
            <StreakBox value={streakRec.wins} label="Wins" variant="gold" />
            <StreakBox value={streakRec.losses} label="Losses" variant="destructive" />
            <StreakBox value={streakRec.draws} label="Draws" variant="secondary" />
            <StreakBox value={`${streakRec.finishRate}%`} label="Finish rate" variant="success" />
          </div>
        </div>
      </div>

      {/* Row 2: Three doughnuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <DoughnutCard title="W / L / D split" data={splitData} filter={splitFilter} onFilter={setSplitFilter} />
        <DoughnutCard title="Win method breakdown" data={winMethodData} filter={wmFilter} onFilter={setWmFilter} />
        <DoughnutCard title="Loss method breakdown" data={lossMethodData.map((d, i) => ({ ...d, color: lossMethodColors[i] || "hsl(var(--muted-foreground))" }))} filter={lmFilter} onFilter={setLmFilter} />
      </div>

      {/* ── S5: Rankings & Elo ── */}
      <SectionHeader title="Rankings & Elo" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-3 mb-3">
        {/* Rank card */}
        <div className="bg-card border border-border rounded-lg p-5 flex flex-col items-center justify-center text-center">
          <div className="font-heading text-[10px] tracking-[2px] uppercase text-muted-foreground">
            {formatEnum(fighterProfile.weight_class)} ranking
          </div>
          <div className="font-heading text-[68px] font-extrabold text-primary leading-none text-gold-glow">
            #{ranking.rank || "—"}
          </div>
          <div className="font-heading text-[15px] font-bold mt-2">{fighterProfile.country || "United Kingdom"}</div>
          <div className="w-9 h-px bg-border my-3" />
          <div className="font-heading text-[22px] font-bold">{elo.toLocaleString()}</div>
          <div className="font-heading text-[10px] tracking-[1.2px] uppercase text-muted-foreground">Elo rating</div>
        </div>

        {/* Elo breakdown */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="font-heading text-[13px] font-bold tracking-[1.5px] uppercase text-foreground mb-3.5 flex items-center justify-between">
            How your Elo is calculated
            <InfoBtn onClick={() => setPopup("elo")} />
          </div>
          <div className="flex flex-col gap-2">
            <EloRow label="Opponent quality" sub="Beating a higher-rated opponent yields more points." weight="×1.4" />
            <EloRow label="Method of victory" sub="Finishes (KO, TKO, Sub) weighted higher than decisions." weight="×1.2" />
            <EloRow label="Recency weighting" sub="Recent fights carry more weight. Rating decays with inactivity." weight="×1.1" />
            <EloRow label="Win / loss margin" sub="Unanimous decisions score higher than split decisions." weight="×1.0" />
          </div>
        </div>
      </div>

      {/* ── S6: Career history ── */}
      <SectionHeader title="Career history" />
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-3 mb-3">
        {/* Fight table */}
        <div className="bg-card border border-border rounded-lg p-5 overflow-x-auto">
          <div className="font-heading text-[13px] font-bold tracking-[1.5px] uppercase text-foreground mb-3.5">
            Recent fight history
          </div>
          <table className="w-full border-collapse min-w-[500px]">
            <thead>
              <tr>
                {["Result", "Opponent", "Method", "Round", "Event", "Date"].map((h) => (
                  <th key={h} className="font-heading text-[10px] tracking-[1.8px] uppercase text-muted-foreground px-2 pb-2.5 text-left border-b border-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fights.slice(0, 10).map((f) => {
                const isWin = f.result === "win" || f.winner_id === fighterProfile.id;
                const isDraw = f.result === "draw";
                const resultLabel = isWin ? "W" : isDraw ? "D" : "L";
                return (
                  <tr key={f.id}>
                    <td className="py-2 px-2 text-[13px] border-b border-border/40">
                      <span className={`font-heading text-[11px] font-bold px-2.5 py-0.5 rounded-[3px] ${isWin ? "bg-primary/10 text-primary border border-primary/30" : isDraw ? "bg-secondary/10 text-secondary border border-secondary/30" : "bg-destructive/10 text-destructive border border-destructive/30"}`}>{resultLabel}</span>
                    </td>
                    <td className="py-2 px-2 text-[13px] border-b border-border/40">{f.opponent_name || "Unknown"}</td>
                    <td className="py-2 px-2 text-[13px] border-b border-border/40">{f.method || "—"}{f.round ? ` R${f.round}` : ""}</td>
                    <td className="py-2 px-2 text-[13px] border-b border-border/40 text-muted-foreground">{f.round || "—"}</td>
                    <td className="py-2 px-2 text-[13px] border-b border-border/40">{f.event_name || "—"}</td>
                    <td className="py-2 px-2 text-[11px] border-b border-border/40 text-muted-foreground">{f.event_date ? new Date(f.event_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—"}</td>
                  </tr>
                );
              })}
              {fights.length === 0 && (
                <tr><td colSpan={6} className="p-5 text-center text-muted-foreground text-[13px]">No fights recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Weight class timeline */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="font-heading text-[13px] font-bold tracking-[1.5px] uppercase text-foreground mb-3.5">
            Weight class history
          </div>
          <div className="flex flex-col">
            {wcHistory.map((wc, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5">
                <div className="font-heading text-[11px] tracking-[1px] text-muted-foreground min-w-[52px] pt-0.5">{wc.period}</div>
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${wc.current ? "bg-primary gold-glow" : "bg-accent border-2 border-border"}`} />
                  {i < wcHistory.length - 1 && <div className="w-0.5 flex-1 min-h-[18px] bg-border" />}
                </div>
                <div className="flex-1 pb-1">
                  <div className="font-heading text-sm font-bold">
                    {formatEnum(wc.weightClass)}
                    {wc.current && <span className="font-heading text-[9px] font-bold tracking-[1px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-px rounded-[10px] ml-2">CURRENT</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{wc.record}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── S7: Opponent record quality ── */}
      <SectionHeader title="Opponent record quality" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="font-heading text-[13px] font-bold tracking-[1.5px] uppercase text-foreground mb-3.5 flex items-center justify-between">
            Strength of schedule
            <InfoBtn onClick={() => setPopup("opp")} />
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-3.5">
            <OppCell value="—" label="Avg opp quality score" />
            <OppCell value="—" label="Avg opp Elo at fight date" />
            <OppCell value={`${opp500}%`} label="Opps with .500+ record" />
            <OppCell value="—" label="Ranked opponents beaten" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="font-heading text-[13px] font-bold tracking-[1.5px] uppercase text-foreground mb-3.5">
            Opponent Elo at fight date
          </div>
          <div className="flex items-center justify-center h-[150px] text-muted-foreground text-xs">
            Data available when Elo tracking is enabled
          </div>
        </div>
      </div>

      {/* ── S8: Profile completeness ── */}
      <SectionHeader title="Profile completeness" />
      <div className="bg-card border border-border rounded-lg p-5 mb-3">
        <div className="flex items-center gap-5 mb-4">
          {/* Ring */}
          <div className="relative w-20 h-20 shrink-0">
            <svg width={80} height={80} viewBox="0 0 80 80">
              <circle cx={40} cy={40} r={34} fill="none" className="stroke-accent" strokeWidth={6} />
              <circle cx={40} cy={40} r={34} fill="none" className="stroke-primary" strokeWidth={6}
                strokeDasharray={`${(completePct / 100) * 213.6} 213.6`}
                strokeLinecap="round" transform="rotate(-90 40 40)" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-heading text-xl font-extrabold text-primary">
              {completePct}%
            </div>
          </div>
          <div className="flex-1">
            <div className="font-heading text-sm font-bold mb-1">Profile is {completePct}% complete</div>
            <div className="text-xs text-muted-foreground">A complete profile ranks higher in matchmaking suggestions and generates more proposals.</div>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {profileFields.map((field) => (
            <div key={field.label}>
              <div className="text-[11px] text-muted-foreground font-heading tracking-[1px] uppercase flex justify-between mb-1">
                <span>{field.label}</span>
                <span className={field.complete ? "text-foreground" : "text-muted-foreground"}>{field.complete ? "✓ Complete" : "Incomplete"}</span>
              </div>
              <div className="bg-accent rounded-[3px] h-[5px] overflow-hidden">
                <div className={`h-full rounded-[3px] ${field.complete ? "bg-primary w-full" : "bg-border w-0"}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Popup modals ── */}
      <PopupModal open={popup === "elo"} onClose={() => setPopup(null)} title="How your Elo rating is calculated" body={
        <div>
          <p className="mb-2.5">Your Elo rating is a dynamic score that reflects the strength of your professional combat record. It is used by the matchmaking algorithm to pair you with appropriately matched opponents and determine your weight class ranking.</p>
          <p className="font-heading text-xs font-bold tracking-[1.5px] uppercase text-muted-foreground mt-3.5 mb-1.5">Inputs & weighting</p>
          <ul className="pl-4 list-disc">
            <li className="mb-1.5"><strong className="text-primary">Opponent quality (×1.4 weight):</strong> The most important factor. Beating a higher-rated opponent earns significantly more points.</li>
            <li className="mb-1.5"><strong className="text-primary">Method of victory (×1.2 weight):</strong> Finishing your opponent by KO, TKO, or Submission scores higher than a Decision win.</li>
            <li className="mb-1.5"><strong className="text-primary">Recency (×1.1 weight):</strong> More recent fights carry more weight. Your rating decays slightly if inactive for more than 12 months.</li>
            <li className="mb-1.5"><strong className="text-primary">Decision margin (×1.0 weight):</strong> A unanimous decision win scores higher than a split decision.</li>
          </ul>
          <p className="font-heading text-xs font-bold tracking-[1.5px] uppercase text-muted-foreground mt-3.5 mb-1.5">How it affects you</p>
          <p>Your Elo rating directly determines your weight class ranking and how you appear in algorithmic matchmaking suggestions to event organisers.</p>
        </div>
      } />
      <PopupModal open={popup === "opp"} onClose={() => setPopup(null)} title="Opponent record quality — what it means" body={
        <div>
          <p className="mb-2.5">The Opponent Record Quality section measures the <strong className="text-primary">strength of your schedule</strong> — how formidable your past opponents were when you fought them.</p>
          <p className="mb-2.5">A fighter with a 10-0 record who faced ten 0-0 opponents is very different from a fighter with a 10-0 record who beat ten ranked competitors.</p>
          <p className="font-heading text-xs font-bold tracking-[1.5px] uppercase text-muted-foreground mt-3.5 mb-1.5">What each metric means</p>
          <ul className="pl-4 list-disc">
            <li className="mb-1.5"><strong className="text-primary">Avg opponent quality score:</strong> A composite score (0–10) based on opponent Elo, record, and finish rate at time of fight.</li>
            <li className="mb-1.5"><strong className="text-primary">Avg opponent Elo at fight date:</strong> The average Elo of every opponent at the time of your fight.</li>
            <li className="mb-1.5"><strong className="text-primary">Opponents with .500+ record:</strong> The percentage of opponents who had at least as many wins as losses when you fought them.</li>
            <li className="mb-1.5"><strong className="text-primary">Ranked opponents beaten:</strong> The number of nationally ranked opponents you have defeated.</li>
          </ul>
        </div>
      } />
    </div>
  );
}

/* ── Sub-components ── */
function RecordPill({ label, w, l, d }: { label: string; w: number; l: number; d: number }) {
  return (
    <div className="bg-card border border-border rounded-md px-4 py-2.5">
      <div className="font-heading text-[10px] tracking-[1.8px] uppercase text-muted-foreground mb-0.5">{label}</div>
      <div className="font-heading text-base font-extrabold">
        <span className="text-primary">{w}</span>W – <span className="text-destructive">{l}</span>L – <span className="text-secondary">{d}</span>D
      </div>
    </div>
  );
}

function RecordPillText({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-md px-4 py-2.5">
      <div className="font-heading text-[10px] tracking-[1.8px] uppercase text-muted-foreground mb-0.5">{label}</div>
      <div className="font-heading text-[15px] font-extrabold text-foreground">{value}</div>
    </div>
  );
}

function DemandItem({ value, label, sub }: { value: number; label: string; sub: string }) {
  return (
    <div className="px-5 py-3 sm:py-0 text-center">
      <div className="font-heading text-4xl font-extrabold text-primary leading-none">{value.toLocaleString()}</div>
      <div className="font-heading text-[10px] tracking-[1.5px] uppercase text-muted-foreground mt-1">{label}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function StreakBox({ value, label, variant }: { value: string | number; label: string; variant: "gold" | "destructive" | "secondary" | "success" }) {
  const colorMap = {
    gold: "text-primary",
    destructive: "text-destructive",
    secondary: "text-secondary",
    success: "text-success",
  };
  return (
    <div className="bg-accent rounded-[5px] px-3 py-2 text-center flex-1">
      <div className={`font-heading text-xl font-extrabold leading-none ${colorMap[variant]}`}>{value}</div>
      <div className="font-heading text-[9px] tracking-[1.2px] uppercase text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function DoughnutCard({ title, data, filter, onFilter }: { title: string; data: { name: string; value: number; color: string }[]; filter: string; onFilter: (v: string) => void }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex flex-col">
      <div className="font-heading text-[13px] font-bold tracking-[1.5px] uppercase text-foreground mb-3.5 flex items-center justify-between flex-wrap gap-1.5">
        {title}
        <Toggle value={filter} onChange={onFilter} />
      </div>
      <div className="flex-1 flex items-center justify-center">
        {data.length > 0 && data.some((d) => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" strokeWidth={3} stroke="hsl(var(--card))">
                {data.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip content={<CustomTip />} />
              <Legend formatter={(v) => <span className="text-[11px] text-foreground">{v}</span>} iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-xs p-5">No data</p>
        )}
      </div>
    </div>
  );
}

function EloRow({ label, sub, weight }: { label: string; sub: string; weight: string }) {
  return (
    <div className="flex items-center justify-between bg-accent rounded-[5px] px-3 py-2">
      <div>
        <div className="font-heading text-[11px] font-bold tracking-[0.5px] text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground mt-px">{sub}</div>
      </div>
      <div className="font-heading text-sm font-extrabold text-primary shrink-0 ml-3">{weight}</div>
    </div>
  );
}

function OppCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-accent rounded-md p-3 text-center">
      <div className="font-heading text-[26px] font-extrabold text-primary leading-none">{value}</div>
      <div className="font-heading text-[10px] tracking-[1.2px] uppercase text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
