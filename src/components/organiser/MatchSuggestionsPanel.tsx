import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sparkles, Check, RefreshCw, Search, ArrowLeft, X, AlertTriangle } from "lucide-react";
import { generateSuggestions } from "@/lib/matchSuggestions";
import type { Database } from "@/integrations/supabase/types";
import { formatEnum } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";

type FighterProfile = Database["public"]["Tables"]["fighter_profiles"]["Row"];
type FightSlot = Database["public"]["Tables"]["fight_slots"]["Row"];

const PRESETS: Record<string, { comp: number; ent: number; style: number; narr: number; label: string }> = {
  action_night: { comp: 30, ent: 40, style: 20, narr: 10, label: "Action Night" },
  championship: { comp: 40, ent: 20, style: 15, narr: 25, label: "Championship" },
  grassroots_dev: { comp: 55, ent: 15, style: 15, narr: 15, label: "Grassroots Dev" },
  ko_special: { comp: 25, ent: 50, style: 15, narr: 10, label: "KO Special" },
  undefeated_clash: { comp: 35, ent: 20, style: 15, narr: 30, label: "Undefeated Clash" },
};

const EXP_TIERS = ["T0", "T1", "T2", "T3"] as const;

function getExpTier(totalPro: number): string {
  if (totalPro === 0) return "T0";
  if (totalPro <= 3) return "T1";
  if (totalPro <= 9) return "T2";
  return "T3";
}

interface MatchSuggestionsPanelProps {
  slot?: FightSlot | null;
  existingProposalFighterIds: string[];
  onSelectPair: (fighterA: FighterProfile, fighterB: FighterProfile) => void;
  eventId?: string;
  weightClassOverride?: string | null;
  disciplineOverride?: string | null;
  /** When set, suggests individual opponents for this fighter (Scenario A / one TBA) */
  anchorFighter?: FighterProfile;
}

function matchesKeyword(fighter: FighterProfile, keyword: string, fights: any[]): boolean {
  const k = keyword.toLowerCase().trim();
  if (!k) return true;
  if (fighter.name.toLowerCase().includes(k)) return true;
  const fighterFights = fights.filter((f) => f.fighter_a_id === fighter.id || f.fighter_b_id === fighter.id);
  const wins = fighterFights.filter((f) => f.winner_id === fighter.id || (f.result === "win" && f.fighter_a_id === fighter.id)).length;
  if (k === "finisher" || k.includes("finish")) {
    const finishes = fighterFights.filter((f) => {
      if (f.winner_id !== fighter.id && !(f.result === "win" && f.fighter_a_id === fighter.id)) return false;
      const m = (f.method || "").toLowerCase();
      return m.includes("ko") || m.includes("tko") || m.includes("sub");
    }).length;
    return wins > 0 && finishes / wins > 0.5;
  }
  if (k === "local" || k.includes("local")) return (fighter.region || "").toLowerCase().includes("local") || fighter.country === "UK";
  if (k === "undefeated") return fighter.record_losses === 0 && fighter.record_wins > 0;
  if (k === "southpaw") return (fighter.stance || "").toLowerCase() === "southpaw";
  if (k === "orthodox") return (fighter.stance || "").toLowerCase() === "orthodox";
  if (k === "amateur") return fighterFights.length <= 3;
  if (k === "experienced" || k.includes("experienc")) return fighterFights.length >= 4;
  return [fighter.name, fighter.style, fighter.region, fighter.stance, fighter.discipline].some((v) => v?.toLowerCase().includes(k));
}

function getFighterFinishRate(fighterId: string, fights: any[]): number {
  const myFights = fights.filter((f) => f.fighter_a_id === fighterId);
  const wins = myFights.filter((f) => f.result === "win");
  if (wins.length === 0) return 0;
  const finishes = wins.filter((f) => f.method && ["KO", "TKO", "Submission"].some((m) => (f.method || "").includes(m)));
  return finishes.length / wins.length;
}

/** Score a single opponent against an anchor fighter. Reuses the same logic as pair scoring. */
function scorePairForAnchor(anchor: FighterProfile, opponent: FighterProfile): { score: number; reason: string } {
  const totalA = anchor.record_wins + anchor.record_losses + anchor.record_draws;
  const totalB = opponent.record_wins + opponent.record_losses + opponent.record_draws;
  const winRateA = totalA > 0 ? anchor.record_wins / totalA : 0.5;
  const winRateB = totalB > 0 ? opponent.record_wins / totalB : 0.5;
  const winRateDiff = Math.abs(winRateA - winRateB);
  const expDiff = Math.abs(totalA - totalB);
  const expPenalty = Math.min(expDiff / 10, 1);
  const styleDiversity = anchor.style && opponent.style && anchor.style !== opponent.style ? -0.1 : 0;
  const countryBonus = anchor.country !== opponent.country ? -0.05 : 0;
  const score = winRateDiff * 3 + expPenalty + styleDiversity + countryBonus;
  const reasons: string[] = [];
  if (winRateDiff < 0.1) reasons.push("Similar win rates");
  if (expDiff <= 3) reasons.push("Similar experience");
  if (anchor.style && opponent.style && anchor.style !== opponent.style) reasons.push("Style clash");
  if (anchor.country !== opponent.country) reasons.push("International");
  return { score: Math.round(score * 100) / 100, reason: reasons.length > 0 ? reasons.join(" · ") : "Viable matchup" };
}

const SLIDER_COLORS = {
  comp: "#e8a020",
  ent: "#22c55e",
  style: "#3b82f6",
  narr: "#a855f7",
};

export function MatchSuggestionsPanel({ slot, existingProposalFighterIds, onSelectPair, eventId, weightClassOverride, disciplineOverride, anchorFighter }: MatchSuggestionsPanelProps) {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [comp, setComp] = useState(50);
  const [ent, setEnt] = useState(50);
  const [style, setStyle] = useState(50);
  const [narr, setNarr] = useState(50);
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [sortBy, setSortBy] = useState("composite");

  // Additional filters
  const [expTiers, setExpTiers] = useState<Set<string>>(new Set(EXP_TIERS));
  const [stanceFilter, setStanceFilter] = useState("any");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [regionFilter, setRegionFilter] = useState("any");
  const [minFinishRate, setMinFinishRate] = useState(0);
  const [undefeatedOnly, setUndefeatedOnly] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);

  // Relative weighting - normalize internally
  const sliderTotal = comp + ent + style + narr;
  const allZero = sliderTotal === 0;
  const normComp = allZero ? 25 : Math.round((comp / sliderTotal) * 100);
  const normEnt = allZero ? 25 : Math.round((ent / sliderTotal) * 100);
  const normStyle = allZero ? 25 : Math.round((style / sliderTotal) * 100);
  const normNarr = allZero ? 25 : 100 - normComp - normEnt - normStyle;

  const applyPreset = (key: string) => {
    const p = PRESETS[key];
    setComp(p.comp); setEnt(p.ent); setStyle(p.style); setNarr(p.narr);
    setSelectedPreset(key);
    setSettingsChanged(false);
  };

  const toggleExpTier = (tier: string) => {
    setExpTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return next;
    });
    setSettingsChanged(true);
  };

  const effectiveWeightClass = weightClassOverride ?? slot?.weight_class ?? null;

  const { data: fighters = [] } = useQuery({
    queryKey: ["match-suggestion-fighters", slot?.id ?? "no-slot", effectiveWeightClass, refreshKey],
    queryFn: async () => {
      let query = supabase.from("fighter_profiles").select("*").order("name");
      if (effectiveWeightClass) {
        query = query.eq("weight_class", effectiveWeightClass as any);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: allFights = [] } = useQuery({
    queryKey: ["match-suggestion-fights"],
    queryFn: async () => {
      const { data } = await supabase.from("fights").select("*");
      return data ?? [];
    },
  });

  const { data: eventData } = useQuery({
    queryKey: ["match-suggestion-event", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data } = await supabase.from("events").select("city, postcode").eq("id", eventId).single();
      return data;
    },
    enabled: !!eventId,
  });

  const regions = useMemo(() => {
    const set = new Set<string>();
    fighters.forEach((f) => { if (f.region) set.add(f.region); });
    return Array.from(set).sort();
  }, [fighters]);

  const suggestions = useMemo(() => {
    const excludeIds = new Set(existingProposalFighterIds);
    // Also exclude the anchor fighter from the pool
    if (anchorFighter) excludeIds.add(anchorFighter.id);
    let filteredPool = fighters.filter((f) => !excludeIds.has(f.id));
    if (availableOnly) filteredPool = filteredPool.filter((f) => f.available);
    filteredPool = filteredPool.filter((f) => {
      const totalPro = f.record_wins + f.record_losses + f.record_draws;
      return expTiers.has(getExpTier(totalPro));
    });
    if (minFinishRate > 0) {
      filteredPool = filteredPool.filter((f) => getFighterFinishRate(f.id, allFights) >= minFinishRate / 100);
    }
    if (regionFilter !== "any") {
      filteredPool = filteredPool.filter((f) => f.region === regionFilter);
    }

    if (anchorFighter) {
      // Anchor mode: score each fighter individually against the anchor
      const scored = filteredPool.map((f) => {
        const { score, reason } = scorePairForAnchor(anchorFighter, f);
        return { fighter: f, score, reason };
      });
      // Apply stance filter
      let filtered = scored;
      if (stanceFilter === "orthodox_southpaw") {
        const anchorStance = (anchorFighter.stance || "").toLowerCase();
        filtered = filtered.filter((item) => {
          const s = (item.fighter.stance || "").toLowerCase();
          return (anchorStance === "orthodox" && s === "southpaw") || (anchorStance === "southpaw" && s === "orthodox");
        });
      } else if (stanceFilter === "same") {
        const anchorStance = (anchorFighter.stance || "").toLowerCase();
        filtered = filtered.filter((item) => {
          const s = (item.fighter.stance || "").toLowerCase();
          return s && anchorStance && s === anchorStance;
        });
      }
      if (undefeatedOnly) {
        filtered = filtered.filter((item) => item.fighter.record_losses === 0 && item.fighter.record_wins > 0);
      }
      if (localOnly && eventData) {
        const eventCity = (eventData.city || "").toLowerCase();
        const eventPostcode = (eventData.postcode || "").toLowerCase().slice(0, 3);
        filtered = filtered.filter((item) => {
          const r = (item.fighter.region || "").toLowerCase();
          const p = (item.fighter.postcode || "").toLowerCase().slice(0, 3);
          return r.includes(eventCity) || p === eventPostcode;
        });
      }
      if (keyword.trim()) {
        filtered = filtered.filter((item) => matchesKeyword(item.fighter, keyword, allFights));
      }
      filtered.sort((a, b) => a.score - b.score);
      return filtered.slice(0, 20);
    }

    // Pair mode (no anchor): existing logic
    const all = generateSuggestions(filteredPool, new Set(), 50);
    let filtered = all;
    if (stanceFilter === "orthodox_southpaw") {
      filtered = filtered.filter((pair) => {
        const sA = (pair.fighterA.stance || "").toLowerCase();
        const sB = (pair.fighterB.stance || "").toLowerCase();
        return (sA === "orthodox" && sB === "southpaw") || (sA === "southpaw" && sB === "orthodox");
      });
    } else if (stanceFilter === "same") {
      filtered = filtered.filter((pair) => {
        const sA = (pair.fighterA.stance || "").toLowerCase();
        const sB = (pair.fighterB.stance || "").toLowerCase();
        return sA && sB && sA === sB;
      });
    }
    if (undefeatedOnly) {
      filtered = filtered.filter((pair) => pair.fighterA.record_losses === 0 || pair.fighterB.record_losses === 0);
    }
    if (localOnly && eventData) {
      const eventCity = (eventData.city || "").toLowerCase();
      const eventPostcode = (eventData.postcode || "").toLowerCase().slice(0, 3);
      filtered = filtered.filter((pair) => {
        const rA = (pair.fighterA.region || "").toLowerCase();
        const rB = (pair.fighterB.region || "").toLowerCase();
        const pA = (pair.fighterA.postcode || "").toLowerCase().slice(0, 3);
        const pB = (pair.fighterB.postcode || "").toLowerCase().slice(0, 3);
        return rA.includes(eventCity) || rB.includes(eventCity) || pA === eventPostcode || pB === eventPostcode;
      });
    }
    if (keyword.trim()) {
      filtered = filtered.filter((pair) =>
        matchesKeyword(pair.fighterA, keyword, allFights) || matchesKeyword(pair.fighterB, keyword, allFights)
      );
    }
    return filtered.slice(0, 20);
  }, [fighters, existingProposalFighterIds, keyword, allFights, comp, ent, style, narr, expTiers, stanceFilter, availableOnly, regionFilter, minFinishRate, undefeatedOnly, localOnly, eventData, anchorFighter]);

  const handleSelect = async (fighterA: FighterProfile, fighterB: FighterProfile) => {
    if (allZero) return;
    if (user && eventId) {
      await supabase.from("organiser_preferences").upsert({
        organiser_id: user.id,
        event_id: eventId,
        preset: selectedPreset,
        w_comp: normComp / 100,
        w_ent: normEnt / 100,
        w_style: normStyle / 100,
        w_narr: normNarr / 100,
      }, { onConflict: "organiser_id,event_id" }).select();
    }
    onSelectPair(fighterA, fighterB);
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    setSettingsChanged(false);
  };

  const handleSliderChange = (setter: (v: number) => void) => (v: number) => {
    setter(v);
    setSelectedPreset(null);
    setSettingsChanged(true);
  };

  /* ── Weight bar segments ── */
  const weightBarSegments = [
    { key: "comp", pct: normComp, color: SLIDER_COLORS.comp, label: "Competitiveness" },
    { key: "ent", pct: normEnt, color: SLIDER_COLORS.ent, label: "Entertainment" },
    { key: "style", pct: normStyle, color: SLIDER_COLORS.style, label: "Style Contrast" },
    { key: "narr", pct: normNarr, color: SLIDER_COLORS.narr, label: "Narrative" },
  ];

  const dominantDim = weightBarSegments.reduce((a, b) => a.pct >= b.pct ? a : b).label;

  return (
    <div className="flex flex-col md:flex-row" style={{ height: "90vh", maxHeight: "90vh", overflow: "hidden" }}>
      {/* ═══ LEFT COLUMN — Config ═══ */}
      <div className="flex flex-col" style={{
        width: "100%", maxWidth: 420, flexShrink: 0, background: "#111318",
        boxShadow: "inset -1px 0 0 rgba(255,255,255,0.04)",
        overflowY: "auto", padding: "28px 24px", gap: 20,
      }}>
        {/* Header */}
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: "#e8eaf0", letterSpacing: "0.04em" }}>
          {anchorFighter ? (
            <>SUGGESTED <span style={{ color: "#e8a020" }}>MATCHES</span></>
          ) : (
            <>SUGGESTED <span style={{ color: "#e8a020" }}>FIGHTS</span></>
          )}
        </h2>

        {/* Anchor fighter summary card */}
        {anchorFighter && (
          <div style={{
            background: "rgba(232,160,32,0.06)", borderRadius: 8, padding: "12px 16px",
          }}>
            <p style={{ fontSize: 9, color: "#e8a020", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
              Anchor fighter
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#e8eaf0" }}>
              {anchorFighter.name}
            </p>
            <p style={{ fontSize: 12, color: "#8b909e", marginTop: 2 }}>
              {anchorFighter.record_wins}-{anchorFighter.record_losses}-{anchorFighter.record_draws} · {formatEnum(anchorFighter.weight_class)}
              {anchorFighter.style && ` · ${formatEnum(anchorFighter.style)}`}
            </p>
          </div>
        )}

        {effectiveWeightClass && (
          <p style={{ fontSize: 12, color: "#8b909e" }}>
            Filtering for <span style={{ color: "#e8a020", fontWeight: 600 }}>{formatEnum(effectiveWeightClass)}</span>
          </p>
        )}

        {!slot && (
          <div style={{ background: "rgba(245,158,11,0.08)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle style={{ width: 14, height: 14, color: "#f59e0b", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#f59e0b" }}>No open slots — a new slot will be created on match confirmation.</span>
          </div>
        )}

        {/* PRESET */}
        <div>
          <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555b6b", marginBottom: 8 }}>PRESET</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                style={{
                  background: selectedPreset === key ? "rgba(232,160,32,0.12)" : "#181c24",
                  color: selectedPreset === key ? "#e8a020" : "#8b909e",
                  borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, border: "none",
                  boxShadow: selectedPreset === key ? "inset 3px 0 0 #e8a020" : "none",
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { if (selectedPreset !== key) e.currentTarget.style.background = "#1e2330"; }}
                onMouseLeave={(e) => { if (selectedPreset !== key) e.currentTarget.style.background = "#181c24"; }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* WEIGHTING */}
        <div>
          <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555b6b", marginBottom: 8 }}>WEIGHTING</p>
          <div className="space-y-3">
            {([
              { key: "comp" as const, label: "Competitiveness", val: comp, set: setComp, color: SLIDER_COLORS.comp },
              { key: "ent" as const, label: "Entertainment", val: ent, set: setEnt, color: SLIDER_COLORS.ent },
              { key: "style" as const, label: "Style Contrast", val: style, set: setStyle, color: SLIDER_COLORS.style },
              { key: "narr" as const, label: "Narrative", val: narr, set: setNarr, color: SLIDER_COLORS.narr },
            ]).map((s) => (
              <div key={s.key}>
                <div className="flex justify-between" style={{ fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: "#8b909e" }}>{s.label}</span>
                  <span style={{ color: s.color, fontWeight: 600 }}>{s.val}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Slider
                    className="flex-1"
                    value={[s.val]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([v]) => handleSliderChange(s.set)(v)}
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={s.val}
                    onChange={(e) => handleSliderChange(s.set)(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    style={{
                      width: 48, height: 28, textAlign: "center", fontSize: 12, fontWeight: 600,
                      background: "#181c24", color: "#e8eaf0", borderRadius: 6, border: "none",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)", outline: "none",
                    }}
                  />
                  <span style={{ fontSize: 10, color: "#555b6b" }}>%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Relative weight stacked bar */}
          {!allZero && (
            <div style={{ marginTop: 12 }}>
              <div className="flex" style={{ height: 6, borderRadius: 3, overflow: "hidden", background: "#1e2330" }}>
                {weightBarSegments.map((seg) => (
                  <div key={seg.key} style={{ width: `${seg.pct}%`, background: seg.color, transition: "width 0.3s ease" }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1" style={{ marginTop: 6 }}>
                {weightBarSegments.map((seg) => (
                  <div key={seg.key} className="flex items-center gap-1">
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: seg.color }} />
                    <span style={{ fontSize: 10, color: "#8b909e" }}>{seg.label} {seg.pct}%</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#8b909e", marginTop: 4 }}>Weighted towards: <span style={{ color: "#e8eaf0", fontWeight: 500 }}>{dominantDim}</span></p>
            </div>
          )}

          {allZero && (
            <p style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>Set at least one dimension above 0</p>
          )}
        </div>

        {/* FILTERS */}
        <div>
          <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555b6b", marginBottom: 8 }}>FILTERS</p>

          {/* Experience tier pills */}
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: "#8b909e", display: "block", marginBottom: 4 }}>Experience Tier</span>
            <div className="flex gap-2">
              {EXP_TIERS.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleExpTier(t)}
                  style={{
                    background: expTiers.has(t) ? "rgba(232,160,32,0.12)" : "#181c24",
                    color: expTiers.has(t) ? "#e8a020" : "#8b909e",
                    borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, border: "none",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Dropdowns side by side */}
          <div className="grid grid-cols-2 gap-2" style={{ marginBottom: 10 }}>
            <div>
              <span style={{ fontSize: 11, color: "#8b909e", display: "block", marginBottom: 4 }}>Stance</span>
              <Select value={stanceFilter} onValueChange={(v) => { setStanceFilter(v); setSettingsChanged(true); }}>
                <SelectTrigger className="h-8 text-xs" style={{ background: "#181c24", border: "none" }}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="orthodox_southpaw">Orthodox vs Southpaw</SelectItem>
                  <SelectItem value="same">Same stance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <span style={{ fontSize: 11, color: "#8b909e", display: "block", marginBottom: 4 }}>Region</span>
              <Select value={regionFilter} onValueChange={(v) => { setRegionFilter(v); setSettingsChanged(true); }}>
                <SelectTrigger className="h-8 text-xs" style={{ background: "#181c24", border: "none" }}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {regions.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Finish rate slider */}
          <div style={{ marginBottom: 10 }}>
            <div className="flex justify-between" style={{ fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: "#8b909e" }}>Min Finish Rate</span>
              <span style={{ color: "#e8a020", fontWeight: 600 }}>{minFinishRate}%</span>
            </div>
            <Slider value={[minFinishRate]} min={0} max={100} step={5} onValueChange={([v]) => { setMinFinishRate(v); setSettingsChanged(true); }} />
          </div>

          {/* Toggle switches */}
          <div className="space-y-2">
            {[
              { id: "avail", label: "Available only", checked: availableOnly, set: setAvailableOnly },
              { id: "undef", label: "Undefeated only", checked: undefeatedOnly, set: setUndefeatedOnly },
              { id: "local", label: "Local fighters", checked: localOnly, set: setLocalOnly },
            ].map((t) => (
              <div key={t.id} className="flex items-center justify-between" style={{ padding: "4px 0" }}>
                <span style={{ fontSize: 12, color: "#8b909e" }}>{t.label}</span>
                <Switch checked={t.checked} onCheckedChange={(v) => { t.set(v); setSettingsChanged(true); }} />
              </div>
            ))}
          </div>
        </div>

        {/* GENERATE button — sticky bottom */}
        <div style={{ position: "sticky", bottom: 0, background: "#111318", padding: "12px 0", boxShadow: "0 -8px 16px rgba(0,0,0,0.3)", marginTop: "auto" }}>
          <button
            onClick={handleRefresh}
            disabled={allZero}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
              background: allZero ? "rgba(232,160,32,0.3)" : "#e8a020",
              color: "#0d0f12", fontSize: 14, fontWeight: 600, cursor: allZero ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: allZero ? "none" : "0 0 12px rgba(232,160,32,0.25)",
            }}
          >
            <RefreshCw style={{ width: 16, height: 16 }} />
            {settingsChanged ? "Refresh" : "Generate Matches"}
          </button>
        </div>
      </div>

      {/* ═══ RIGHT COLUMN — Results ═══ */}
      <div className="flex-1 flex flex-col" style={{ background: "#0d1018", overflowY: "auto", padding: "28px 24px" }}>
        {/* Header row */}
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#e8eaf0" }}>MATCHES</h3>
          <span style={{ background: "#181c24", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "#8b909e" }}>
            {suggestions.length} results
          </span>
        </div>

        {/* Settings changed notice */}
        {settingsChanged && (
          <div style={{ background: "rgba(245,158,11,0.08)", borderRadius: 8, padding: "8px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle style={{ width: 14, height: 14, color: "#f59e0b", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#f59e0b" }}>Settings changed — click Refresh</span>
          </div>
        )}

        {/* Sort */}
        <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: "#8b909e" }}>Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-7 text-xs" style={{ width: 160, background: "#181c24", border: "none" }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="composite">Composite Score</SelectItem>
              <SelectItem value="elo">Elo Similarity</SelectItem>
              <SelectItem value="style">Style Contrast</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Keyword search */}
        <div className="relative" style={{ marginBottom: 16 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" style={{ width: 14, height: 14, color: "#555b6b" }} />
          <input
            placeholder='"finisher", "undefeated", "southpaw"...'
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{
              width: "100%", height: 36, paddingLeft: 32, paddingRight: 12, borderRadius: 8,
              background: "#181c24", border: "none", color: "#e8eaf0", fontSize: 13, outline: "none",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
            }}
          />
        </div>

        {/* Suggestion cards */}
        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ padding: "60px 0", color: "#555b6b" }}>
            <Sparkles style={{ width: 32, height: 32, marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: 14, fontWeight: 500 }}>No matches found</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Try adjusting filters or weights</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {suggestions.map((pair, idx) => {
              const eloA = 1200 + (pair.fighterA.record_wins * 30) - (pair.fighterA.record_losses * 20);
              const eloB = 1200 + (pair.fighterB.record_wins * 30) - (pair.fighterB.record_losses * 20);
              const eloDelta = Math.abs(eloA - eloB);
              const compositeScore = Math.max(0, Math.min(100, 100 - eloDelta / 5));

              return (
                <div
                  key={`${pair.fighterA.id}-${pair.fighterB.id}`}
                  style={{
                    background: "#181c24", borderRadius: 10, padding: 16,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)",
                    transition: "all 0.2s ease", cursor: "default",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#1e2330"; e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3), 0 0 0 1px rgba(232,160,32,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#181c24"; e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)"; }}
                >
                  {/* Top: names */}
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#e8eaf0" }}>{pair.fighterA.name}</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: "#e8a020" }}>VS</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#e8eaf0" }}>{pair.fighterB.name}</span>
                  </div>

                  {/* Score bar */}
                  <div style={{ marginTop: 10 }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 9, color: "#555b6b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Composite Score</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#e8a020" }}>{compositeScore.toFixed(0)}</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: "#1e2330" }}>
                      <div style={{ width: `${compositeScore}%`, height: "100%", borderRadius: 2, background: "#e8a020", transition: "width 0.3s" }} />
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-1" style={{ marginTop: 8, fontSize: 10, color: "#8b909e" }}>
                    <span>{formatEnum(pair.fighterA.weight_class)}</span>
                    <span>·</span>
                    <span>Elo Δ{eloDelta}</span>
                    <span>·</span>
                    <span>{pair.reason}</span>
                  </div>

                  {/* Bottom: elo + select */}
                  <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
                    <span style={{ fontSize: 10, color: "#555b6b" }}>
                      {pair.fighterA.record_wins}W-{pair.fighterA.record_losses}L ({eloA}) vs {pair.fighterB.record_wins}W-{pair.fighterB.record_losses}L ({eloB})
                    </span>
                    <button
                      onClick={() => handleSelect(pair.fighterA, pair.fighterB)}
                      disabled={allZero}
                      style={{
                        background: "rgba(232,160,32,0.12)", color: "#e8a020", borderRadius: 6,
                        padding: "5px 14px", fontSize: 12, fontWeight: 600, border: "none",
                        cursor: allZero ? "not-allowed" : "pointer", transition: "all 0.15s",
                        display: "flex", alignItems: "center", gap: 4,
                      }}
                      onMouseEnter={(e) => { if (!allZero) e.currentTarget.style.background = "rgba(232,160,32,0.2)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(232,160,32,0.12)"; }}
                    >
                      <Check style={{ width: 12, height: 12 }} /> Select
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
