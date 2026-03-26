import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sparkles, Check, RefreshCw, Search } from "lucide-react";
import { generateSuggestions } from "@/lib/matchSuggestions";
import type { Database } from "@/integrations/supabase/types";

type FighterProfile = Database["public"]["Tables"]["fighter_profiles"]["Row"];
type FightSlot = Database["public"]["Tables"]["fight_slots"]["Row"];

import { formatEnum } from "@/lib/format";

interface MatchSuggestionsPanelProps {
  slot: FightSlot;
  existingProposalFighterIds: string[];
  onSelectPair: (fighterA: FighterProfile, fighterB: FighterProfile) => void;
}

function matchesKeyword(fighter: FighterProfile, keyword: string, fights: any[]): boolean {
  const k = keyword.toLowerCase().trim();
  if (!k) return true;

  // Name match
  if (fighter.name.toLowerCase().includes(k)) return true;

  // Keyword-based filters
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
  if (k === "amateur") return totalFights > 0 && fighterFights.some((f: any) => f.is_amateur);
  if (k === "experienced" || k.includes("experienc")) return totalFights >= 4;

  // Fallback: search name, style, region
  return [fighter.name, fighter.style, fighter.region, fighter.stance, fighter.discipline].some((v) => v?.toLowerCase().includes(k));
}

export function MatchSuggestionsPanel({ slot, existingProposalFighterIds, onSelectPair }: MatchSuggestionsPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [keyword, setKeyword] = useState("");

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
    if (!keyword.trim()) return all.slice(0, 5);
    return all.filter((pair) =>
      matchesKeyword(pair.fighterA, keyword, allFights) || matchesKeyword(pair.fighterB, keyword, allFights)
    ).slice(0, 5);
  }, [fighters, existingProposalFighterIds, keyword, allFights]);

  return (
    <div className="rounded-lg border border-primary/30 bg-card p-6">
      <div className="flex items-center justify-between mb-4">
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

      <p className="text-xs text-muted-foreground mb-3">
        AI-ranked pairings for {formatEnum(slot.weight_class)} based on competitive balance, experience, and style diversity.
      </p>

      {/* Keyword filter */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder='Filter: "finisher", "undefeated", "southpaw", "local", "amateur", "experienced"...'
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

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
              <Button size="sm" variant="outline" onClick={() => onSelectPair(pair.fighterA, pair.fighterB)} className="gap-1 shrink-0">
                <Check className="h-3 w-3" /> Select
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
