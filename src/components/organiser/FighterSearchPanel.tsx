import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X, Check, UserCheck } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { SearchableCountrySelect } from "@/components/SearchableCountrySelect";

type FighterProfile = Database["public"]["Tables"]["fighter_profiles"]["Row"];
type FightSlot = Database["public"]["Tables"]["fight_slots"]["Row"];
type WeightClass = Database["public"]["Enums"]["weight_class"];
type CountryCode = Database["public"]["Enums"]["country_code"];
type FightingStyle = Database["public"]["Enums"]["fighting_style"];

const WEIGHT_CLASSES = Constants.public.Enums.weight_class;
const STYLES = Constants.public.Enums.fighting_style;

import { formatEnum } from "@/lib/format";

interface FighterSearchPanelProps {
  slot: FightSlot;
  eventId: string;
  selectedFighterA: FighterProfile | null;
  selectedFighterB: FighterProfile | null;
  onSelectFighter: (fighter: FighterProfile) => void;
  onCancel: () => void;
}

export function FighterSearchPanel({
  slot,
  eventId,
  selectedFighterA,
  selectedFighterB,
  onSelectFighter,
  onCancel,
}: FighterSearchPanelProps) {
  const [weightClass, setWeightClass] = useState<WeightClass>(slot.weight_class);
  const [country, setCountry] = useState<CountryCode | "all">("all");
  const [style, setStyle] = useState<FightingStyle | "all">("all");
  const [searchName, setSearchName] = useState("");
  const [coachNominatedOnly, setCoachNominatedOnly] = useState(false);

  // Reset filter when slot changes
  useEffect(() => {
    setWeightClass(slot.weight_class);
  }, [slot.id, slot.weight_class]);

  // Fetch coach-nominated fighter IDs for this event
  const { data: nominatedFighterIds = [] } = useQuery({
    queryKey: ["coach-nominations-for-event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_event_nominations")
        .select("fighter_id")
        .eq("event_id", eventId);
      if (error) throw error;
      return data.map((n) => n.fighter_id);
    },
  });

  const nominatedSet = new Set(nominatedFighterIds);

  const { data: fighters = [], isLoading } = useQuery({
    queryKey: ["fighter-search", weightClass, country, style, searchName, coachNominatedOnly, nominatedFighterIds],
    queryFn: async () => {
      let q = supabase
        .from("fighter_profiles")
        .select("*")
        .eq("weight_class", weightClass)
        .eq("available", true)
        .order("name");

      if (country !== "all") q = q.eq("country", country);
      if (style !== "all") q = q.eq("style", style);
      if (searchName.trim()) q = q.ilike("name", `%${searchName.trim()}%`);
      if (coachNominatedOnly && nominatedFighterIds.length > 0) {
        q = q.in("id", nominatedFighterIds);
      } else if (coachNominatedOnly && nominatedFighterIds.length === 0) {
        return [];
      }

      const { data, error } = await q.limit(50);
      if (error) throw error;
      return data;
    },
  });

  const isSelected = (id: string) =>
    selectedFighterA?.id === id || selectedFighterB?.id === id;

  return (
    <div className="rounded-lg border border-primary/30 bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-xl text-foreground">
          FIND FIGHTERS —{" "}
          <span className="text-primary">Slot #{slot.slot_number}</span>
        </h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {selectedFighterA && !selectedFighterB && (
        <div className="mb-4 p-3 rounded-md border border-primary/20 bg-primary/5">
          <p className="text-sm text-primary">
            <Check className="h-3 w-3 inline mr-1" />
            Fighter A: <strong>{selectedFighterA.name}</strong> — Now select Fighter B
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <Select value={weightClass} onValueChange={(v) => setWeightClass(v as WeightClass)}>
          <SelectTrigger>
            <SelectValue placeholder="Weight" />
          </SelectTrigger>
          <SelectContent>
            {WEIGHT_CLASSES.map((wc) => (
              <SelectItem key={wc} value={wc}>{formatEnum(wc)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <SearchableCountrySelect value={country} onValueChange={(v) => setCountry(v as CountryCode | "all")} includeAll />

        <Select value={style} onValueChange={(v) => setStyle(v as FightingStyle | "all")}>
          <SelectTrigger>
            <SelectValue placeholder="Style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Styles</SelectItem>
            {STYLES.map((s) => (
              <SelectItem key={s} value={s}>{formatEnum(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Toggle
          variant="outline"
          size="sm"
          pressed={coachNominatedOnly}
          onPressedChange={setCoachNominatedOnly}
          className="gap-1.5 data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:border-primary/40"
        >
          <UserCheck className="h-3.5 w-3.5" />
          Coach Nominated
          {nominatedFighterIds.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] h-4">
              {nominatedFighterIds.length}
            </Badge>
          )}
        </Toggle>
      </div>

      {/* Results */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground animate-pulse">Searching...</p>
      ) : fighters.length === 0 ? (
        <p className="text-sm text-muted-foreground">No fighters found matching filters.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
          {fighters.map((f) => (
            <button
              key={f.id}
              onClick={() => !isSelected(f.id) && onSelectFighter(f)}
              disabled={isSelected(f.id)}
              className={`text-left rounded-md border p-3 transition-colors ${
                isSelected(f.id)
                  ? "border-primary bg-primary/10 cursor-default"
                  : "border-border hover:border-primary/40 bg-card cursor-pointer"
              }`}
            >
              <p className="text-sm font-medium text-foreground">{f.name}</p>
              <p className="text-xs text-muted-foreground">
                {f.record_wins}W-{f.record_losses}L-{f.record_draws}D · {f.country}
              </p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {nominatedSet.has(f.id) && (
                  <Badge className="text-[10px] px-1 py-0 bg-primary/15 text-primary border-primary/30">
                    <UserCheck className="h-2.5 w-2.5 mr-0.5" />Nominated
                  </Badge>
                )}
                {f.style && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {formatEnum(f.style)}
                  </Badge>
                )}
              </div>
              {isSelected(f.id) && (
                <p className="text-xs text-primary mt-1">
                  {selectedFighterA?.id === f.id ? "Fighter A" : "Fighter B"}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
