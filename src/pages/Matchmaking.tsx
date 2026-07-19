import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SearchableCountrySelect } from "@/components/SearchableCountrySelect";
import { ArrowLeft, ArrowRight, Sparkles, Check, X, Search, AlertTriangle, Swords, ChevronDown, ChevronUp, SlidersHorizontal, ExternalLink, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  PRESETS,
  enrichFighter,
  runMatchmakingEngine,
  type FighterWithStats,
  type ScoredMatch,
  type Preset,
} from "@/lib/matchmakingEngine";
import { useMatchmakingConsent } from "@/lib/matchmakingConsent";
import { MatchmakingConsentModal } from "@/components/matchmaking/MatchmakingConsentModal";

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

const PRESET_BLURBS: Record<string, string> = {
  action_night:     "High-energy card built for finishes and crowd reaction.",
  championship:     "Even, high-stakes matchups suited to title fights.",
  grassroots:       "Balanced pairings for developing fighters.",
  ko_special:       "Prioritises knockout artists and stoppage rates.",
  undefeated_clash: "Pits unbeaten records against each other for narrative.",
};

const FLAG_COPY: Record<string, string> = {
  "Debut": "One or both fighters have no logged fights. Coach acknowledgement required before confirming.",
  "Welfare": "Notable experience gap between fighters. Review with both coaches to confirm suitability.",
  "No Platform History": "This fighter's rating is built from self-reported history using neutral assumptions — not yet tested against a Matchup-confirmed opponent. Verify suitability with fighter/coach before confirming this match.",
  "No Competitive History": "Fighter has no verified competitive record on Matchup — treat rating as provisional.",
};

const EXP_TIERS: { value: string; label: string }[] = [
  { value: "any", label: "Any experience" },
  { value: "0", label: "Debut (0 fights)" },
  { value: "1", label: "Novice (1–3)" },
  { value: "2", label: "Intermediate (4–9)" },
  { value: "3", label: "Experienced (10+)" },
];

function compatibilityLabel(score: number): string {
  if (score >= 0.75) return "Strong match";
  if (score >= 0.55) return "Good match";
  return "Viable match";
}

// Canonical discipline values used by fighter_profiles.discipline
const CANONICAL_DISCIPLINES = ["Boxing", "Muay Thai", "MMA", "Kickboxing", "Bjj"] as const;

function normaliseDiscipline(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const cleaned = raw.toLowerCase().replace(/_/g, " ").replace(/[()]/g, " ");
  // split on separators
  const tokens = cleaned.split(/&|\/|,|\band\b|\+/g).map((t) => t.trim()).filter(Boolean);
  const out = new Set<string>();
  for (const t of tokens) {
    if (t.includes("muay thai")) out.add("Muay Thai");
    if (/\bmma\b/.test(t) || t.includes("mixed martial")) out.add("MMA");
    if (t.includes("boxing") && !t.includes("kick")) out.add("Boxing");
    if (t.includes("kickboxing") || t.includes("kick boxing")) out.add("Kickboxing");
    if (/\bbjj\b/.test(t) || t.includes("brazilian jiu")) out.add("Bjj");
  }
  return Array.from(out);
}

export default function Matchmaking() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Walkthrough state
  const [walkStep, setWalkStep] = useState(0); // 0..2, 3 = done
  const [presetKey, setPresetKey] = useState("action_night");
  const [weightFilter, setWeightFilter] = useState<string>("any");
  const [expTier, setExpTier] = useState<string>("any");
  const [nationalityFilter, setNationalityFilter] = useState<string>("all");

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [confirmedFighterIds, setConfirmedFighterIds] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState("");
  const [showRefine, setShowRefine] = useState(false);

  // Refine sliders (initialised from preset, only used when Refine is opened)
  const [wComp, setWComp] = useState(30);
  const [wEnt, setWEnt] = useState(40);
  const [wStyle, setWStyle] = useState(20);
  const [wNarr, setWNarr] = useState(10);

  // Bout type modal
  const [boutTypeMatch, setBoutTypeMatch] = useState<ScoredMatch | null>(null);

  const applyPreset = useCallback((key: string) => {
    setPresetKey(key);
    const p = PRESETS[key];
    setWComp(Math.round(p.w_comp * 100));
    setWEnt(Math.round(p.w_ent * 100));
    setWStyle(Math.round(p.w_style * 100));
    setWNarr(Math.round(p.w_narr * 100));
  }, []);

  const handleSlider = useCallback((which: "comp" | "ent" | "style" | "narr", newVal: number) => {
    const current = { comp: wComp, ent: wEnt, style: wStyle, narr: wNarr };
    const others = (["comp", "ent", "style", "narr"] as const).filter(k => k !== which);
    const oldOtherSum = others.reduce((s, k) => s + current[k], 0);
    const newOtherSum = 100 - newVal;
    const vals = { ...current, [which]: newVal };
    if (oldOtherSum === 0) {
      const each = Math.floor(newOtherSum / 3);
      const remainder = newOtherSum - each * 3;
      others.forEach((k, i) => { vals[k] = each + (i < remainder ? 1 : 0); });
    } else {
      const ratio = newOtherSum / oldOtherSum;
      let assigned = newVal;
      others.forEach((k, i) => {
        if (i === others.length - 1) vals[k] = 100 - assigned;
        else { vals[k] = Math.max(0, Math.round(current[k] * ratio)); assigned += vals[k]; }
      });
    }
    setWComp(vals.comp); setWEnt(vals.ent); setWStyle(vals.style); setWNarr(vals.narr);
  }, [wComp, wEnt, wStyle, wNarr]);

  const activePreset: Preset = useMemo(() => ({
    label: "Custom",
    w_comp: wComp / 100,
    w_ent: wEnt / 100,
    w_style: wStyle / 100,
    w_narr: wNarr / 100,
  }), [wComp, wEnt, wStyle, wNarr]);

  const { data: event } = useQuery({
    queryKey: ["matchmaking-event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, discipline, date, location, city")
        .eq("id", eventId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  const disciplineTokens = useMemo(() => normaliseDiscipline(event?.discipline), [event?.discipline]);
  const disciplineUnrecognised = !!event?.discipline && disciplineTokens.length === 0;

  const { data: fighters = [], isLoading: loadingFighters } = useQuery({
    queryKey: ["matchmaking-pool", eventId, disciplineTokens.join("|")],
    queryFn: async () => {
      let query = supabase.from("fighter_profiles").select("*");
      if (disciplineTokens.length > 0) query = query.in("discipline", disciplineTokens);
      const { data: rawFighters, error } = await query;
      if (error) throw error;
      if (!rawFighters) return [];
      const fighterIds = rawFighters.map((f) => f.id);
      const { data: fights = [] } = await supabase
        .from("fights")
        .select("fighter_a_id, result, method")
        .in("fighter_a_id", fighterIds);
      const { data: gymLinks = [] } = await supabase
        .from("fighter_gym_links")
        .select("fighter_id, gym_id")
        .eq("status", "approved")
        .in("fighter_id", fighterIds);
      const gymMap = new Map<string, string[]>();
      gymLinks.forEach((gl) => {
        const arr = gymMap.get(gl.fighter_id) || [];
        arr.push(gl.gym_id);
        gymMap.set(gl.fighter_id, arr);
      });
      return rawFighters.map((f) => enrichFighter(f, fights || [], gymMap.get(f.id) || []));
    },
    enabled: !!event,
  });

  const pool = useMemo(() => {
    return fighters.filter((f) => {
      if (weightFilter !== "any" && f.weight_class !== weightFilter) return false;
      if (expTier !== "any" && String(f.expTier) !== expTier) return false;
      if (nationalityFilter !== "all" && (f as { country?: string }).country !== nationalityFilter) return false;
      return true;
    });
  }, [fighters, weightFilter, expTier, nationalityFilter]);

  const suggestions = useMemo(() => {
    if (pool.length < 2) return [];
    return runMatchmakingEngine(pool, activePreset);
  }, [pool, activePreset]);

  const filtered = useMemo(() => {
    let list = suggestions.filter(
      (s) => !dismissed.has(`${s.fighterA.id}-${s.fighterB.id}`) &&
             !confirmedFighterIds.has(s.fighterA.id) &&
             !confirmedFighterIds.has(s.fighterB.id)
    );
    if (filterText.trim()) {
      const lower = filterText.toLowerCase();
      list = list.filter((s) =>
        s.fighterA.name.toLowerCase().includes(lower) ||
        s.fighterB.name.toLowerCase().includes(lower)
      );
    }
    return list;
  }, [suggestions, dismissed, filterText, confirmedFighterIds]);

  const availableWeights = useMemo(() => {
    const set = new Set<string>();
    fighters.forEach((f) => { if (f.weight_class) set.add(f.weight_class); });
    return Array.from(set);
  }, [fighters]);

  const handleConfirmWithBoutType = async (boutType: string) => {
    const match = boutTypeMatch;
    if (!match || !eventId || !user) return;
    try {
      await supabase.from("event_fight_slots").insert({
        event_id: eventId,
        weight_class: match.fighterA.weight_class,
        discipline: match.fighterA.discipline,
        fighter_a_id: match.fighterA.id,
        fighter_b_id: match.fighterB.id,
        bout_type: boutType,
        status: "confirmed",
      });
      await supabase.from("match_suggestions").insert({
        event_id: eventId,
        fighter_a_id: match.fighterA.id,
        fighter_b_id: match.fighterB.id,
        composite_score: match.composite,
        competitiveness: match.competitiveness,
        entertainment: match.entertainment,
        style_contrast: match.styleContrast,
        narrative: match.narrative,
        flags: match.flags,
        preset_used: presetKey,
        status: "confirmed",
      });
      setConfirmedFighterIds((prev) => {
        const next = new Set(prev);
        next.add(match.fighterA.id);
        next.add(match.fighterB.id);
        return next;
      });
      setBoutTypeMatch(null);
      toast.success(`${match.fighterA.name} vs ${match.fighterB.name} confirmed as ${boutType}!`);
    } catch {
      toast.error("Failed to confirm match");
    }
  };

  const handleDismiss = async (match: ScoredMatch) => {
    if (!eventId) return;
    try {
      await supabase.from("match_suggestions").insert({
        event_id: eventId,
        fighter_a_id: match.fighterA.id,
        fighter_b_id: match.fighterB.id,
        composite_score: match.composite,
        competitiveness: match.competitiveness,
        entertainment: match.entertainment,
        style_contrast: match.styleContrast,
        narrative: match.narrative,
        flags: match.flags,
        preset_used: presetKey,
        status: "dismissed",
      });
    } catch { /* silent */ }
    setDismissed((prev) => new Set(prev).add(`${match.fighterA.id}-${match.fighterB.id}`));
  };

  const walkthroughActive = walkStep < 3;

  const { loading: consentLoading, needsConsent, recordConsent } = useMatchmakingConsent();

  if (consentLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (needsConsent) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <MatchmakingConsentModal
          open
          onConsented={() => { /* query invalidation reveals content */ }}
          recordConsent={recordConsent}
        />
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="container py-8 max-w-3xl">
          <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Event
          </Button>

          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="font-heading text-2xl text-foreground">MATCHMAKER</h1>
          </div>

          {event && (
            <div className="mb-6">
              <h3 className="font-heading text-lg text-foreground">{event.title}</h3>
              <p className="text-sm text-muted-foreground">{event.city || event.location}</p>
            </div>
          )}

          {walkthroughActive ? (
            <Walkthrough
              step={walkStep}
              setStep={setWalkStep}
              presetKey={presetKey}
              applyPreset={applyPreset}
              weightFilter={weightFilter}
              setWeightFilter={setWeightFilter}
              availableWeights={availableWeights}
              expTier={expTier}
              setExpTier={setExpTier}
              regionFilter={regionFilter}
              setRegionFilter={setRegionFilter}
              availableOnly={availableOnly}
              setAvailableOnly={setAvailableOnly}
            />
          ) : (
            <>
              {/* Header row: preset badge + start over + refine toggle */}
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="capitalize">
                    {PRESETS[presetKey]?.label || "Custom"}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setWalkStep(0)} className="gap-1 text-muted-foreground">
                    <RotateCcw className="h-3 w-3" /> Start over
                  </Button>
                </div>
                <Button
                  variant={showRefine ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowRefine((s) => !s)}
                  className="gap-2"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {showRefine ? "Hide refine" : "Refine match"}
                </Button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search fighters by name"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Refine panel */}
              {showRefine && (
                <div className="rounded-lg bg-card p-5 mb-6 space-y-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3)" }}>
                  <div>
                    <p className="text-sm font-medium mb-3 text-foreground">Weighting</p>
                    <div className="space-y-4">
                      <SliderRow label="Competitiveness" value={wComp} onChange={(v) => handleSlider("comp", v)} />
                      <SliderRow label="Entertainment" value={wEnt} onChange={(v) => handleSlider("ent", v)} />
                      <SliderRow label="Style Contrast" value={wStyle} onChange={(v) => handleSlider("style", v)} />
                      <SliderRow label="Narrative" value={wNarr} onChange={(v) => handleSlider("narr", v)} />
                      <p className="text-[10px] text-muted-foreground text-right">
                        Total: {wComp + wEnt + wStyle + wNarr}%
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FilterField label="Weight class">
                      <Select value={weightFilter} onValueChange={setWeightFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any weight</SelectItem>
                          {availableWeights.map((w) => (
                            <SelectItem key={w} value={w}>{WEIGHT_CLASS_LABELS[w] || w}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FilterField>
                    <FilterField label="Experience tier">
                      <Select value={expTier} onValueChange={setExpTier}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EXP_TIERS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FilterField>
                    <FilterField label="Region">
                      <Input
                        placeholder="e.g. London"
                        value={regionFilter}
                        onChange={(e) => setRegionFilter(e.target.value)}
                      />
                    </FilterField>
                    <FilterField label="Availability">
                      <Button
                        variant={availableOnly ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAvailableOnly((v) => !v)}
                        className="w-full justify-start"
                      >
                        {availableOnly ? "Available only" : "All fighters"}
                      </Button>
                    </FilterField>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground mb-4">
                <strong>{filtered.length}</strong> suggestions · <strong>{dismissed.size}</strong> reviewed · <strong>{confirmedFighterIds.size / 2}</strong> confirmed
              </p>

              <div className="space-y-4">
                {loadingFighters ? (
                  <div className="text-muted-foreground animate-pulse py-12 text-center">Analysing fighter pool...</div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-lg bg-card p-12 text-center" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                    <Swords className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {suggestions.length === 0
                        ? "Not enough eligible fighters to generate suggestions — try widening your filters."
                        : "No matches left — adjust your search or refine settings."}
                    </p>
                  </div>
                ) : (
                  filtered.slice(0, 20).map((match) => (
                    <MatchCard
                      key={`${match.fighterA.id}-${match.fighterB.id}`}
                      match={match}
                      onConfirm={() => setBoutTypeMatch(match)}
                      onDismiss={() => handleDismiss(match)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <Dialog open={!!boutTypeMatch} onOpenChange={(open) => { if (!open) setBoutTypeMatch(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Card Position</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Where should {boutTypeMatch?.fighterA.name} vs {boutTypeMatch?.fighterB.name} sit on the card?
          </p>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => handleConfirmWithBoutType("Main Event")}>
              Main Event
            </Button>
            <Button className="flex-1" onClick={() => handleConfirmWithBoutType("Undercard")}>
              Undercard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
    </TooltipProvider>
  );
}

// ── Walkthrough ─────────────────────────────────────────────────────────
interface WalkthroughProps {
  step: number;
  setStep: (n: number) => void;
  presetKey: string;
  applyPreset: (k: string) => void;
  weightFilter: string;
  setWeightFilter: (v: string) => void;
  availableWeights: string[];
  expTier: string;
  setExpTier: (v: string) => void;
  regionFilter: string;
  setRegionFilter: (v: string) => void;
  availableOnly: boolean;
  setAvailableOnly: (v: boolean) => void;
}

function Walkthrough(p: WalkthroughProps) {
  const totalSteps = 3;
  const stepTitles = [
    "What kind of card are you building?",
    "Any weight class preference?",
    "Anything else to narrow it down?",
  ];

  return (
    <div className="rounded-lg bg-card p-6 sm:p-8" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3)" }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Step {p.step + 1} of {totalSteps}</p>
        {p.step > 0 && (
          <Button variant="ghost" size="sm" onClick={() => p.setStep(totalSteps)} className="text-muted-foreground">
            Skip
          </Button>
        )}
      </div>
      <h2 className="font-heading text-2xl text-foreground mb-6">{stepTitles[p.step]}</h2>

      {p.step === 0 && (
        <div className="space-y-2">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => { p.applyPreset(key); p.setStep(1); }}
              className={`w-full text-left rounded-lg p-4 transition-all bg-background hover:bg-muted ${
                p.presetKey === key ? "ring-2 ring-primary" : ""
              }`}
            >
              <p className="font-heading text-lg text-foreground">{preset.label}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{PRESET_BLURBS[key]}</p>
            </button>
          ))}
        </div>
      )}

      {p.step === 1 && (
        <div className="space-y-4">
          <FilterField label="Weight class">
            <Select value={p.weightFilter} onValueChange={p.setWeightFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any weight class</SelectItem>
                {p.availableWeights.map((w) => (
                  <SelectItem key={w} value={w}>{WEIGHT_CLASS_LABELS[w] || w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <p className="text-xs text-muted-foreground">Discipline is already set by the event.</p>
        </div>
      )}

      {p.step === 2 && (
        <div className="space-y-4">
          <FilterField label="Experience tier">
            <Select value={p.expTier} onValueChange={p.setExpTier}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXP_TIERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Region">
            <Input
              placeholder="e.g. London"
              value={p.regionFilter}
              onChange={(e) => p.setRegionFilter(e.target.value)}
            />
          </FilterField>
          <FilterField label="Availability">
            <Button
              variant={p.availableOnly ? "default" : "outline"}
              size="sm"
              onClick={() => p.setAvailableOnly(!p.availableOnly)}
              className="w-full justify-start"
            >
              {p.availableOnly ? "Available fighters only" : "Include unavailable"}
            </Button>
          </FilterField>
        </div>
      )}

      <div className="flex items-center justify-between mt-8 pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => p.setStep(Math.max(0, p.step - 1))}
          disabled={p.step === 0}
          className="gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        {p.step > 0 && (
          <Button size="sm" onClick={() => p.setStep(p.step + 1)} className="gap-1">
            {p.step === totalSteps - 1 ? "See suggestions" : "Next"} <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────
function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium text-foreground tabular-nums">{value}%</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={0} max={100} step={1} className="w-full" />
    </div>
  );
}

interface MatchCardProps {
  match: ScoredMatch;
  onConfirm: () => void;
  onDismiss: () => void;
}

function MatchCard({ match, onConfirm, onDismiss }: MatchCardProps) {
  const { fighterA: a, fighterB: b } = match;
  const [whyOpen, setWhyOpen] = useState(true);
  const label = compatibilityLabel(match.composite);
  const barPct = Math.max(6, Math.min(100, Math.round(match.composite * 100)));

  return (
    <div className="rounded-lg bg-card p-5" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3)" }}>
      {/* vs layout */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-4">
        <div className="text-right">
          <Link to={`/fighters/${a.id}`} className="font-heading text-lg text-foreground hover:text-primary block truncate">
            {a.name}
          </Link>
          <p className="text-xs text-muted-foreground tabular-nums">
            {a.record_wins}W · {a.record_losses}L · {a.record_draws}D
          </p>
          {a.weight_class && (
            <Badge variant="outline" className="text-[10px] mt-1">
              {WEIGHT_CLASS_LABELS[a.weight_class] || a.weight_class}
            </Badge>
          )}
        </div>
        <span className="font-heading text-primary text-xl px-2">VS</span>
        <div className="text-left">
          <Link to={`/fighters/${b.id}`} className="font-heading text-lg text-foreground hover:text-primary block truncate">
            {b.name}
          </Link>
          <p className="text-xs text-muted-foreground tabular-nums">
            {b.record_wins}W · {b.record_losses}L · {b.record_draws}D
          </p>
          {b.weight_class && (
            <Badge variant="outline" className="text-[10px] mt-1">
              {WEIGHT_CLASS_LABELS[b.weight_class] || b.weight_class}
            </Badge>
          )}
        </div>
      </div>

      {/* Compatibility bar + label + warning icons */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-foreground">{label}</span>
          {match.flags.length > 0 && (
            <div className="flex items-center gap-1.5">
              {match.flags.map((flag) => (
                <Tooltip key={flag}>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-background"
                      aria-label={`Warning: ${flag}`}
                    >
                      <AlertTriangle className={`h-3.5 w-3.5 ${flag === "Welfare" ? "text-destructive" : "text-amber-500"}`} />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">{flag}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${barPct}%` }}
          />
        </div>
      </div>

      {/* Why this match — visible by default, collapsible */}
      <Collapsible open={whyOpen} onOpenChange={setWhyOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mb-2">
            {whyOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Why this match
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mb-4">
          <p className="text-xs text-muted-foreground italic">{match.explanation}</p>
          {match.flags.map((flag) => (
            <div key={flag} className="rounded-md bg-background p-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${flag === "Welfare" ? "text-destructive" : "text-amber-500"}`} />
                <div>
                  <p className="text-xs font-medium text-foreground">{flag}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {FLAG_COPY[flag] || "Review this flag with both coaches before confirming."}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end flex-wrap">
        <Button variant="ghost" size="sm" asChild className="gap-1 text-muted-foreground">
          <Link to={`/fighters/${a.id}`}><ExternalLink className="h-3 w-3" /> View A</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild className="gap-1 text-muted-foreground">
          <Link to={`/fighters/${b.id}`}><ExternalLink className="h-3 w-3" /> View B</Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss} className="gap-1 text-muted-foreground">
          <X className="h-3 w-3" /> Dismiss
        </Button>
        <Button size="sm" onClick={onConfirm} className="gap-1">
          <Check className="h-3 w-3" /> Accept
        </Button>
      </div>
    </div>
  );
}
