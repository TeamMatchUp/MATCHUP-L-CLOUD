import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, RefreshCw } from "lucide-react";
import { generateSuggestions } from "@/lib/matchSuggestions";
import type { Database } from "@/integrations/supabase/types";

type FighterProfile = Database["public"]["Tables"]["fighter_profiles"]["Row"];
type FightSlot = Database["public"]["Tables"]["fight_slots"]["Row"];

function formatEnum(val: string) {
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface MatchSuggestionsPanelProps {
  slot: FightSlot;
  existingProposalFighterIds: string[];
  onSelectPair: (fighterA: FighterProfile, fighterB: FighterProfile) => void;
}

export function MatchSuggestionsPanel({
  slot,
  existingProposalFighterIds,
  onSelectPair,
}: MatchSuggestionsPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["match-suggestions", slot.id, slot.weight_class, refreshKey],
    queryFn: async () => {
      const { data: fighters, error } = await supabase
        .from("fighter_profiles")
        .select("*")
        .eq("weight_class", slot.weight_class)
        .eq("available", true)
        .order("name");

      if (error) throw error;
      if (!fighters) return [];

      const excludeIds = new Set(existingProposalFighterIds);
      return generateSuggestions(fighters, excludeIds, 5);
    },
  });

  return (
    <div className="rounded-lg border border-primary/30 bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-xl text-foreground">
            SUGGESTED <span className="text-primary">MATCHES</span>
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="gap-1"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        AI-ranked pairings for {formatEnum(slot.weight_class)} based on competitive balance, experience, and style diversity.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground animate-pulse">Analysing fighters...</p>
      ) : suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Not enough available fighters in this weight class to generate suggestions.
        </p>
      ) : (
        <div className="space-y-3">
          {suggestions.map((pair, idx) => (
            <div
              key={`${pair.fighterA.id}-${pair.fighterB.id}`}
              className="flex items-center gap-3 rounded-md border border-border p-3 hover:border-primary/40 transition-colors"
            >
              <span className="text-xs font-heading text-muted-foreground w-6">
                #{idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-foreground truncate">
                    {pair.fighterA.name}
                  </span>
                  <span className="text-primary font-heading text-xs">VS</span>
                  <span className="font-medium text-foreground truncate">
                    {pair.fighterB.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {pair.fighterA.record_wins}W-{pair.fighterA.record_losses}L vs{" "}
                    {pair.fighterB.record_wins}W-{pair.fighterB.record_losses}L
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {pair.reason}
                  </Badge>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSelectPair(pair.fighterA, pair.fighterB)}
                className="gap-1 shrink-0"
              >
                <Check className="h-3 w-3" /> Select
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
