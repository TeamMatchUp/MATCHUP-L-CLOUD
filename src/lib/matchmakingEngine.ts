import type { Database } from "@/integrations/supabase/types";

type FighterProfile = Database["public"]["Tables"]["fighter_profiles"]["Row"];

// ── Presets ──────────────────────────────────────────────────────────────
export interface Preset {
  label: string;
  w_comp: number;
  w_ent: number;
  w_style: number;
  w_narr: number;
}

export const PRESETS: Record<string, Preset> = {
  action_night:     { label: "Action Night",      w_comp: 0.30, w_ent: 0.40, w_style: 0.20, w_narr: 0.10 },
  championship:     { label: "Championship",       w_comp: 0.40, w_ent: 0.20, w_style: 0.15, w_narr: 0.25 },
  grassroots:       { label: "Grassroots",         w_comp: 0.55, w_ent: 0.15, w_style: 0.15, w_narr: 0.15 },
  ko_special:       { label: "KO Special",         w_comp: 0.25, w_ent: 0.50, w_style: 0.15, w_narr: 0.10 },
  undefeated_clash: { label: "Undefeated Clash",   w_comp: 0.35, w_ent: 0.20, w_style: 0.15, w_narr: 0.30 },
};

// ── Style contrast lookup ────────────────────────────────────────────────
const STYLE_CONTRAST: Record<string, number> = {
  // MMA
  "Striker|Wrestler": 0.95,
  "Striker|BJJ-Submission": 0.88,
  "Dirty Boxer|BJJ-Submission": 0.78,
  "Wrestler|BJJ-Submission": 0.70,
  // Muay Thai
  "Teep|Aggressive": 0.90,
  "Teep|Forward": 0.90,
  "Rhythm|Aggressive": 0.90,
  "Rhythm|Forward": 0.90,
  "Teep|Clinch-Heavy": 0.82,
  "Rhythm|Clinch-Heavy": 0.82,
  "Aggressive|Counter": 0.85,
  "Aggressive|Timing": 0.85,
  "Forward|Counter": 0.85,
  "Forward|Timing": 0.85,
  // Boxing
  "Out-Boxer|Pressure": 0.88,
  "Out-Boxer|In-Fighter": 0.72,
  "Pressure|Counter-Puncher": 0.80,
  "Out-Boxer|Counter-Puncher": 0.22,
};

function getStyleContrast(a: string | null, b: string | null): number {
  if (!a || !b) return 0.50;
  const key1 = `${a}|${b}`;
  const key2 = `${b}|${a}`;
  return STYLE_CONTRAST[key1] ?? STYLE_CONTRAST[key2] ?? 0.50;
}

// ── Experience tiers ─────────────────────────────────────────────────────
function getExpTier(totalPro: number): number {
  if (totalPro === 0) return 0;
  if (totalPro <= 3) return 1;
  if (totalPro <= 9) return 2;
  return 3;
}

// ── Types ────────────────────────────────────────────────────────────────
export interface FighterWithStats extends FighterProfile {
  totalPro: number;
  winPct: number;
  finishRate: number;
  expTier: number;
  gymIds: string[];
}

export interface ScoredMatch {
  fighterA: FighterWithStats;
  fighterB: FighterWithStats;
  competitiveness: number;
  entertainment: number;
  styleContrast: number;
  narrative: number;
  composite: number;
  flags: string[];
  explanation: string;
}

// ── Build fighter stats ──────────────────────────────────────────────────
export function enrichFighter(
  f: FighterProfile,
  fights: { fighter_a_id: string; result: string; method: string | null }[],
  gymIds: string[]
): FighterWithStats {
  const totalPro = f.record_wins + f.record_losses + f.record_draws;
  const winPct = totalPro > 0 ? f.record_wins / totalPro : 0;

  // Finish rate from fights table
  const myFights = fights.filter((ft) => ft.fighter_a_id === f.id);
  const finishes = myFights.filter(
    (ft) => ft.result === "win" && ft.method && ["KO", "TKO", "Submission"].includes(ft.method)
  ).length;
  const finishRate = myFights.length > 0 ? finishes / myFights.length : 0;

  return {
    ...f,
    totalPro,
    winPct,
    finishRate,
    expTier: getExpTier(totalPro),
    gymIds,
  };
}

// ── Safety gates ─────────────────────────────────────────────────────────
function passesSafetyGates(a: FighterWithStats, b: FighterWithStats): { pass: boolean; flags: string[] } {
  const flags: string[] = [];

  // Same gym exclusion
  const sharedGym = a.gymIds.some((g) => b.gymIds.includes(g));
  if (sharedGym) return { pass: false, flags: ["Same Gym"] };

  // Experience tier gap
  const tierGap = Math.abs(a.expTier - b.expTier);
  const proDiff = Math.abs(a.totalPro - b.totalPro);

  if (tierGap > 2) return { pass: false, flags: ["Experience Gap"] };
  if (tierGap === 2 && proDiff > 3) return { pass: false, flags: ["Experience Gap"] };
  if (tierGap > 1 && !(tierGap === 2 && proDiff <= 3)) return { pass: false, flags: ["Experience Gap"] };

  // Debut flag
  if (a.totalPro === 0 || b.totalPro === 0) flags.push("Debut");
  // Welfare flag: big record difference
  if (proDiff > 5) flags.push("Welfare");

  return { pass: true, flags };
}

// ── Scoring ──────────────────────────────────────────────────────────────
function scoreCompetitiveness(a: FighterWithStats, b: FighterWithStats): number {
  return 1 - Math.abs(a.winPct - b.winPct);
}

function scoreEntertainment(a: FighterWithStats, b: FighterWithStats): number {
  return (a.finishRate + b.finishRate) / 2;
}

function scoreStyleContrast(a: FighterWithStats, b: FighterWithStats): number {
  return getStyleContrast(a.fighting_substyle, b.fighting_substyle);
}

function scoreNarrative(a: FighterWithStats, b: FighterWithStats): number {
  let score = 0;
  // Both undefeated
  if (a.record_losses === 0 && b.record_losses === 0 && a.totalPro >= 1 && b.totalPro >= 1) score += 0.3;
  // Same region
  if (a.region && b.region && a.region === b.region) score += 0.2;
  // Weight class match
  if (a.weight_class === b.weight_class) score += 0.1;
  return Math.min(score, 1);
}

function generateExplanation(m: ScoredMatch): string {
  const parts: string[] = [];
  if (m.competitiveness > 0.8) parts.push("closely matched");
  if (m.entertainment > 0.6) parts.push("high finish rate");
  if (m.styleContrast > 0.7) parts.push("contrasting styles");
  if (m.narrative > 0.2) parts.push("compelling storyline");
  if (m.flags.includes("Debut")) parts.push("featuring a debutant");

  const discipline = m.fighterA.discipline || "combat sports";
  if (parts.length === 0) return `Viable ${discipline} matchup based on overall scoring.`;
  return `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)} ${discipline} fighters${parts.length > 1 ? " with " + parts.slice(1).join(" and ") : ""} — should produce an exciting bout.`;
}

// ── Main engine ──────────────────────────────────────────────────────────
export function runMatchmakingEngine(
  fighters: FighterWithStats[],
  preset: Preset
): ScoredMatch[] {
  const results: ScoredMatch[] = [];

  for (let i = 0; i < fighters.length; i++) {
    for (let j = i + 1; j < fighters.length; j++) {
      const a = fighters[i];
      const b = fighters[j];

      const { pass, flags } = passesSafetyGates(a, b);
      if (!pass) continue;

      const comp = scoreCompetitiveness(a, b);
      const ent = scoreEntertainment(a, b);
      const style = scoreStyleContrast(a, b);
      const narr = scoreNarrative(a, b);

      const composite =
        comp * preset.w_comp +
        ent * preset.w_ent +
        style * preset.w_style +
        narr * preset.w_narr;

      const match: ScoredMatch = {
        fighterA: a,
        fighterB: b,
        competitiveness: comp,
        entertainment: ent,
        styleContrast: style,
        narrative: narr,
        composite,
        flags,
        explanation: "",
      };
      match.explanation = generateExplanation(match);
      results.push(match);
    }
  }

  results.sort((a, b) => b.composite - a.composite);
  return results;
}
