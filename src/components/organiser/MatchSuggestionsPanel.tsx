import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sparkles, Check, RefreshCw, Search } from "lucide-react";
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
  /** Override weight class filter (used when no slot exists) */
  weightClassOverride?: string | null;
  /** Override discipline filter */
  disciplineOverride?: string | null;
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

export function MatchSuggestionsPanel({ slot, existingProposalFighterIds, onSelectPair, eventId, weightClassOverride, disciplineOverride }: MatchSuggestionsPanelProps) {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [comp, setComp] = useState(30);
  const [ent, setEnt] = useState(30);
  const [style, setStyle] = useState(20);
  const [narr, setNarr] = useState(20);

  // Additional filters
  const [expTiers, setExpTiers] = useState<Set<string>>(new Set(EXP_TIERS));
  const [stanceFilter, setStanceFilter] = useState("any");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [regionFilter, setRegionFilter] = useState("any");
  const [minFinishRate, setMinFinishRate] = useState(0);
  const [undefeatedOnly, setUndefeatedOnly] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);

  const adjustSliders = useCallback((changed: "comp" | "ent" | "style" | "narr", newVal: number) => {
    const others = { comp, ent, style, narr };
    others[changed] = newVal;
    const remaining = 100 - newVal;
    const otherKeys = (["comp", "ent", "style", "narr"] as const).filter((k) => k !== changed);
    const otherSum = otherKeys.reduce((s, k) => s + others[k], 0);
    if (otherSum === 0) {
      const each = Math.floor(remaining / 3);
      otherKeys.forEach((k, i) => { others[k] = i < remaining % 3 ? each + 1 : each; });
    } else {
      let distributed = 0;
      otherKeys.forEach((k, i) => {
        if (i === otherKeys.length - 1) {
          others[k] = remaining - distributed;
        } else {
          others[k] = Math.round((others[k] / otherSum) * remaining);
          distributed += others[k];
        }
      });
    }
    setComp(others.comp);
    setEnt(others.ent);
    setStyle(others.style);
    setNarr(others.narr);
  }, [comp, ent, style, narr]);

  const applyPreset = (key: string) => {
    const p = PRESETS[key];
    setComp(p.comp); setEnt(p.ent); setStyle(p.style); setNarr(p.narr);
    setSelectedPreset(key);
  };

  const toggleExpTier = (tier: string) => {
    setExpTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  };

  const { data: fighters = [] } = useQuery({
    queryKey: ["match-suggestion-fighters", slot.id, slot.weight_class, refreshKey],
    queryFn: async () => {
      let query = supabase.from("fighter_profiles").select("*").eq("weight_class", slot.weight_class).order("name");
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

  // Get distinct regions
  const regions = useMemo(() => {
    const set = new Set<string>();
    fighters.forEach((f) => { if (f.region) set.add(f.region); });
    return Array.from(set).sort();
  }, [fighters]);

  const suggestions = useMemo(() => {
    const excludeIds = new Set(existingProposalFighterIds);
    
    // Pre-filter fighters based on the new filters
    let filteredPool = fighters.filter((f) => !excludeIds.has(f.id));
    
    if (availableOnly) {
      filteredPool = filteredPool.filter((f) => f.available);
    }

    // Experience tier filter
    filteredPool = filteredPool.filter((f) => {
      const totalPro = f.record_wins + f.record_losses + f.record_draws;
      return expTiers.has(getExpTier(totalPro));
    });

    // Finish rate filter
    if (minFinishRate > 0) {
      filteredPool = filteredPool.filter((f) => {
        const rate = getFighterFinishRate(f.id, allFights);
        return rate >= minFinishRate / 100;
      });
    }

    // Region filter
    if (regionFilter !== "any") {
      filteredPool = filteredPool.filter((f) => f.region === regionFilter);
    }

    // Generate base suggestions from filtered pool
    const all = generateSuggestions(filteredPool, new Set(), 50);

    // Post-filter pairs
    let filtered = all;

    // Stance filter
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

    // Undefeated only
    if (undefeatedOnly) {
      filtered = filtered.filter((pair) =>
        pair.fighterA.record_losses === 0 || pair.fighterB.record_losses === 0
      );
    }

    // Local fighters
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

    // Keyword filter
    if (keyword.trim()) {
      filtered = filtered.filter((pair) =>
        matchesKeyword(pair.fighterA, keyword, allFights) || matchesKeyword(pair.fighterB, keyword, allFights)
      );
    }

    return filtered.slice(0, 20);
  }, [fighters, existingProposalFighterIds, keyword, allFights, comp, ent, style, narr, expTiers, stanceFilter, availableOnly, regionFilter, minFinishRate, undefeatedOnly, localOnly, eventData]);

  const handleSelect = async (fighterA: FighterProfile, fighterB: FighterProfile) => {
    if (user && eventId) {
      await supabase.from("organiser_preferences").upsert({
        organiser_id: user.id,
        event_id: eventId,
        preset: selectedPreset,
        w_comp: comp / 100,
        w_ent: ent / 100,
        w_style: style / 100,
        w_narr: narr / 100,
      }, { onConflict: "organiser_id,event_id" }).select();
    }
    onSelectPair(fighterA, fighterB);
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-xl text-foreground">
            SUGGESTED <span className="text-primary">MATCHES</span>
          </h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setRefreshKey((k) => k + 1)} className="gap-1">
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        AI-ranked pairings for {formatEnum(slot.weight_class)} based on competitive balance, experience, and style diversity.
      </p>

      {/* Preset selector */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Preset</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                selectedPreset === key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {([
          { key: "comp" as const, label: "Competitiveness", val: comp, set: (v: number) => adjustSliders("comp", v) },
          { key: "ent" as const, label: "Entertainment", val: ent, set: (v: number) => adjustSliders("ent", v) },
          { key: "style" as const, label: "Style Contrast", val: style, set: (v: number) => adjustSliders("style", v) },
          { key: "narr" as const, label: "Narrative", val: narr, set: (v: number) => adjustSliders("narr", v) },
        ]).map((s) => (
          <div key={s.key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="text-primary font-medium">{s.val}%</span>
            </div>
            <Slider value={[s.val]} min={0} max={100} step={5} onValueChange={([v]) => { s.set(v); setSelectedPreset(null); }} />
          </div>
        ))}
      </div>

      {/* Additional Filters */}
      <div className="space-y-3 border-t border-border pt-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filters</p>

        {/* Experience Tier */}
        <div>
          <Label className="text-xs text-muted-foreground">Experience Tier</Label>
          <div className="flex gap-2 mt-1">
            {EXP_TIERS.map((t) => (
              <button
                key={t}
                onClick={() => toggleExpTier(t)}
                className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                  expTiers.has(t) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Stance */}
          <div>
            <Label className="text-xs text-muted-foreground">Stance</Label>
            <Select value={stanceFilter} onValueChange={setStanceFilter}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="orthodox_southpaw">Orthodox vs Southpaw</SelectItem>
                <SelectItem value="same">Same stance only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Region */}
          <div>
            <Label className="text-xs text-muted-foreground">Region</Label>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                <SelectItem value="any">Any</SelectItem>
                {regions.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Finish rate slider */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Min Finish Rate</span>
            <span className="text-primary font-medium">{minFinishRate}%</span>
          </div>
          <Slider value={[minFinishRate]} min={0} max={100} step={5} onValueChange={([v]) => setMinFinishRate(v)} />
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={availableOnly} onCheckedChange={setAvailableOnly} id="available-only" />
            <Label htmlFor="available-only" className="text-xs text-muted-foreground cursor-pointer">Available only</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={undefeatedOnly} onCheckedChange={setUndefeatedOnly} id="undefeated-only" />
            <Label htmlFor="undefeated-only" className="text-xs text-muted-foreground cursor-pointer">Undefeated only</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={localOnly} onCheckedChange={setLocalOnly} id="local-only" />
            <Label htmlFor="local-only" className="text-xs text-muted-foreground cursor-pointer">Local fighters</Label>
          </div>
        </div>
      </div>

      {/* Keyword filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder='"finisher", "undefeated", "southpaw", "local"...'
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      {/* Suggestions list — scrollable */}
      {suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {keyword.trim() ? "No matches found for that filter." : "Not enough available fighters to generate suggestions."}
        </p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {suggestions.map((pair, idx) => (
            <div
              key={`${pair.fighterA.id}-${pair.fighterB.id}`}
              className={`flex items-center gap-3 rounded-md border p-3 hover:border-primary/40 transition-colors ${idx === 0 && keyword.trim() ? "border-primary/50 bg-primary/5" : "border-border"}`}
            >
              <span className="text-xs font-heading text-muted-foreground w-6">#{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-foreground truncate">{pair.fighterA.name}</span>
                  <span className="text-primary font-heading text-xs">VS</span>
                  <span className="font-medium text-foreground truncate">{pair.fighterB.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {pair.fighterA.record_wins}W-{pair.fighterA.record_losses}L vs {pair.fighterB.record_wins}W-{pair.fighterB.record_losses}L
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{pair.reason}</Badge>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => handleSelect(pair.fighterA, pair.fighterB)} className="gap-1 shrink-0">
                <Check className="h-3 w-3" /> Select
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}