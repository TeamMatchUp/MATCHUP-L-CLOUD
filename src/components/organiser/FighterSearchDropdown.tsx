import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { formatEnum } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";
import { Constants } from "@/integrations/supabase/types";

type FighterProfile = Database["public"]["Tables"]["fighter_profiles"]["Row"];

interface FighterSearchDropdownProps {
  label: string;
  selected: FighterProfile | null;
  onSelect: (fighter: FighterProfile) => void;
  onClear: () => void;
  excludeId?: string;
  coachId?: string | null;
  eventId?: string;
}

const PAGE_SIZE = 10;

export function FighterSearchDropdown({ label, selected, onSelect, onClear, excludeId, coachId, eventId }: FighterSearchDropdownProps) {
  const [name, setName] = useState("");
  const [weightClass, setWeightClass] = useState("all");
  const [country, setCountry] = useState("all");
  const [discipline, setDiscipline] = useState("all");
  const [coachNominated, setCoachNominated] = useState(false);
  const [page, setPage] = useState(0);

  // Get nominated fighter IDs for this event + coach-linked fighters
  const { data: nominatedFighterIds = [] } = useQuery({
    queryKey: ["nominated-fighter-ids", eventId],
    queryFn: async () => {
      const ids = new Set<string>();
      // From coach_event_nominations
      const { data: nominations } = await supabase
        .from("coach_event_nominations")
        .select("fighter_id")
        .eq("event_id", eventId!);
      (nominations ?? []).forEach((n: any) => ids.add(n.fighter_id));

      // From fighter_event_interests
      const { data: interests } = await supabase
        .from("fighter_event_interests")
        .select("fighter_id")
        .eq("event_id", eventId!);
      (interests ?? []).forEach((i: any) => ids.add(i.fighter_id));

      // Fighters linked to gyms via approved gym links (coach-managed fighters)
      const { data: gymFighters } = await supabase
        .from("fighter_gym_links")
        .select("fighter_id")
        .eq("status", "approved");
      (gymFighters ?? []).forEach((f: any) => ids.add(f.fighter_id));

      return Array.from(ids);
    },
    enabled: !!eventId,
  });

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["fighter-dropdown", name, weightClass, country, discipline, coachNominated, coachId, page, eventId, nominatedFighterIds],
    queryFn: async () => {
      // If coach nominated filter is on but no nominated IDs, return empty
      if (coachNominated && nominatedFighterIds.length === 0) return [];

      let q = supabase.from("fighter_profiles").select("*").eq("available", true).order("name").range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (name.trim()) q = q.ilike("name", `%${name.trim()}%`);
      if (weightClass !== "all") q = q.eq("weight_class", weightClass as any);
      if (country !== "all") q = q.eq("country", country as any);
      if (discipline !== "all") q = q.eq("discipline", discipline);
      if (coachNominated) {
        // Show fighters that were added by any coach (created_by_coach_id is not null)
        // OR nominated for this event
        if (nominatedFighterIds.length > 0) {
          q = q.or(`created_by_coach_id.not.is.null,id.in.(${nominatedFighterIds.join(",")})`);
        } else {
          q = q.not("created_by_coach_id", "is", null);
        }
      }
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: distinctDisciplines = [] } = useQuery({
    queryKey: ["distinct-disciplines"],
    queryFn: async () => {
      const { data } = await supabase.from("fighter_profiles").select("discipline").not("discipline", "is", null);
      const set = new Set((data ?? []).map((d: any) => d.discipline).filter(Boolean));
      return Array.from(set).sort();
    },
    staleTime: 60000,
  });

  const filtered = excludeId ? results.filter((f) => f.id !== excludeId) : results;

  if (selected) {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{label}</Label>
        <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 p-2">
          <div>
            <p className="text-sm font-medium text-foreground">{selected.name}</p>
            <p className="text-xs text-muted-foreground">{formatEnum(selected.weight_class)} · {selected.record_wins}W-{selected.record_losses}L</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClear}>Change</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {/* Filters */}
      <div className="grid grid-cols-2 gap-2">
        <div className="relative col-span-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search by name..." value={name} onChange={(e) => { setName(e.target.value); setPage(0); }} className="pl-8 h-8 text-sm" />
        </div>
        <Select value={weightClass} onValueChange={(v) => { setWeightClass(v); setPage(0); }}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Weight class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All weights</SelectItem>
            {Constants.public.Enums.weight_class.map((wc) => (
              <SelectItem key={wc} value={wc}>{formatEnum(wc)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={country} onValueChange={(v) => { setCountry(v); setPage(0); }}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Country" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {Constants.public.Enums.country_code.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={discipline} onValueChange={(v) => { setDiscipline(v); setPage(0); }}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Discipline" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All disciplines</SelectItem>
            {distinctDisciplines.map((d) => (
              <SelectItem key={d} value={d}>{formatEnum(d)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch checked={coachNominated} onCheckedChange={(v) => { setCoachNominated(v); setPage(0); }} id={`coach-nom-${label}`} />
          <Label htmlFor={`coach-nom-${label}`} className="text-xs text-muted-foreground cursor-pointer">
            {coachId ? "My fighters" : "Coach Nominated"}
          </Label>
        </div>
      </div>

      {/* Results list */}
      <div className="border border-border rounded-md max-h-52 overflow-y-auto">
        {isLoading ? (
          <p className="text-xs text-muted-foreground p-3 text-center">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3 text-center">No fighters found</p>
        ) : (
          filtered.map((f) => (
            <button
              key={f.id}
              onClick={() => onSelect(f)}
              className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex justify-between items-center border-b border-border last:border-0"
            >
              <div>
                <span className="text-foreground font-medium">{f.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{f.record_wins}W-{f.record_losses}L</span>
              </div>
              <span className="text-xs text-muted-foreground">{formatEnum(f.weight_class)}</span>
            </button>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="h-7 text-xs gap-1">
          <ChevronLeft className="h-3 w-3" /> Prev
        </Button>
        <span className="text-xs text-muted-foreground">Page {page + 1}</span>
        <Button variant="ghost" size="sm" disabled={filtered.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)} className="h-7 text-xs gap-1">
          Next <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
