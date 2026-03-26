import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
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

interface MatchSuggestionsPanelProps {
  slot: FightSlot;
  existingProposalFighterIds: string[];
  onSelectPair: (fighterA: FighterProfile, fighterB: FighterProfile) => void;
  eventId?: string;
}

function matchesKeyword(fighter: FighterProfile, keyword: string, fights: any[]): boolean {
  const k = keyword.toLowerCase().trim();
  if (!k) return true;
  if (fighter.name.toLowerCase().includes(k)) return true;

  const fighterFights = fights.filter((f) => f.fighter_a_id === fighter.id || f.fighter_b_id === fighter.id);
  const wins = fighterFights.filter((f) => f.winner_id === fighter.id || (f.result === "win" && f.fighter_a_id === fighter.id)).length;
  const totalFights = fighterFights.length;

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
  if (k === "amateur") return totalFights <= 3;
  if (k === "experienced" || k.includes("experienc")) return totalFights >= 4;

  return [fighter.name, fighter.style, fighter.region, fighter.stance, fighter.discipline].some((v) => v?.toLowerCase().includes(k));
}

export function MatchSuggestionsPanel({ slot, existingProposalFighterIds, onSelectPair, eventId }: MatchSuggestionsPanelProps) {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [comp, setComp] = useState(30);
  const [ent, setEnt] = useState(30);
  const [style, setStyle] = useState(20);
  const [narr, setNarr] = useState(20);

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
    setComp(p.comp);
    setEnt(p.ent);
    setStyle(p.style);
    setNarr(p.narr);
    setSelectedPreset(key);
  };

  const { data: fighters = [] } = useQuery({
    queryKey: ["match-suggestion-fighters", slot.id, slot.weight_class, refreshKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fighter_profiles").select("*").eq("weight_class", slot.weight_class).eq("available", true).order("name");
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

  const suggestions = useMemo(() => {
    const excludeIds = new Set(existingProposalFighterIds);
    const all = generateSuggestions(fighters, excludeIds, 20);
    let filtered = all;
    if (keyword.trim()) {
      filtered = filtered.filter((pair) =>
        matchesKeyword(pair.fighterA, keyword, allFights) || matchesKeyword(pair.fighterB, keyword, allFights)
      );
    }
    return filtered.slice(0, 10);
  }, [fighters, existingProposalFighterIds, keyword, allFights, comp, ent, style, narr]);

  const handleSelect = async (fighterA: FighterProfile, fighterB: FighterProfile) => {
    // Save preset and weights to organiser_preferences
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

      {/* Keyword filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder='"finisher", "undefeated", "southpaw", "local", "amateur", "experienced"...'
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      {/* Suggestions list */}
      {suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {keyword.trim() ? "No matches found for that filter." : "Not enough available fighters to generate suggestions."}
        </p>
      ) : (
        <div className="space-y-3">
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
