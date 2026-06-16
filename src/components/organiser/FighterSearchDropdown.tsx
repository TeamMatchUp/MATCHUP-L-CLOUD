import { useState } from "react";
import { SearchableCountrySelect } from "@/components/SearchableCountrySelect";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, ChevronLeft, ChevronRight, Sparkles, Users, MapPin, X } from "lucide-react";
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
  /** When set, the top-of-list "Suggested" group filters by this weight class. */
  preferredWeightClass?: string | null;
  /** When set, suggestions prefer matching discipline. */
  preferredDiscipline?: string | null;
}

const PAGE_SIZE = 20;

type FighterRow = FighterProfile & { __gymName?: string | null };

export function FighterSearchDropdown({
  label, selected, onSelect, onClear, excludeId, coachId, eventId,
  preferredWeightClass, preferredDiscipline,
}: FighterSearchDropdownProps) {
  const [name, setName] = useState("");
  const [weightClass, setWeightClass] = useState("all");
  const [country, setCountry] = useState("all");
  const [discipline, setDiscipline] = useState("all");
  const [gymSearch, setGymSearch] = useState("");
  const [coachNominated, setCoachNominated] = useState(false);
  const [page, setPage] = useState(0);

  // Suggestion / "my fighters" nominated IDs for this event
  const { data: nominatedFighterIds = [] } = useQuery({
    queryKey: ["nominated-fighter-ids", eventId],
    queryFn: async () => {
      const ids = new Set<string>();
      const { data: nominations } = await supabase
        .from("coach_event_nominations")
        .select("fighter_id")
        .eq("event_id", eventId!);
      (nominations ?? []).forEach((n: any) => ids.add(n.fighter_id));
      const { data: interests } = await supabase
        .from("fighter_event_interests")
        .select("fighter_id")
        .eq("event_id", eventId!);
      (interests ?? []).forEach((i: any) => ids.add(i.fighter_id));
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
    queryKey: ["fighter-dropdown", name, weightClass, country, discipline, gymSearch, coachNominated, coachId, page, eventId, nominatedFighterIds],
    queryFn: async () => {
      let q = supabase
        .from("fighter_profiles")
        .select("*, fighter_gym_links(is_primary, status, gyms(name))")
        .eq("available", true)
        .order("name")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (name.trim()) q = q.ilike("name", `%${name.trim()}%`);
      if (weightClass !== "all") q = q.eq("weight_class", weightClass as any);
      if (country !== "all") q = q.eq("country", country as any);
      if (discipline !== "all") q = q.eq("discipline", discipline);
      if (coachNominated) {
        const coachFilterIds = new Set(nominatedFighterIds);
        if (coachFilterIds.size > 0) {
          q = q.or(`created_by_coach_id.not.is.null,id.in.(${Array.from(coachFilterIds).join(",")})`);
        } else {
          q = q.not("created_by_coach_id", "is", null);
        }
      }
      const { data } = await q;
      let rows: FighterRow[] = (data ?? []).map((f: any) => {
        const primary = (f.fighter_gym_links ?? []).find((l: any) => l.is_primary && l.status === "approved")
          ?? (f.fighter_gym_links ?? []).find((l: any) => l.status === "approved");
        return { ...f, __gymName: primary?.gyms?.name ?? null };
      });
      if (gymSearch.trim()) {
        const k = gymSearch.trim().toLowerCase();
        rows = rows.filter((r) => (r.__gymName || "").toLowerCase().includes(k));
      }
      return rows;
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

  // Split into algorithm-suggested vs full browse
  const suggested = filtered.filter((f) => {
    const wcMatch = preferredWeightClass ? f.weight_class === preferredWeightClass : false;
    const discMatch = preferredDiscipline ? f.discipline === preferredDiscipline : false;
    return wcMatch || discMatch;
  }).slice(0, 4);
  const suggestedIds = new Set(suggested.map((s) => s.id));
  const browseList = filtered.filter((f) => !suggestedIds.has(f.id));

  if (selected) {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{label}</Label>
        <div
          className="flex items-center justify-between rounded-md p-3"
          style={{ background: "rgba(232,160,32,0.06)", boxShadow: "inset 0 0 0 1px rgba(232,160,32,0.25)" }}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{selected.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {formatEnum(selected.weight_class)} · {selected.record_wins}-{selected.record_losses}-{selected.record_draws}
              {(selected as any).__gymName ? ` · ${(selected as any).__gymName}` : ""}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClear}><X className="h-3.5 w-3.5 mr-1" /> Change</Button>
        </div>
      </div>
    );
  }

  const FighterCard = ({ f }: { f: FighterRow }) => (
    <button
      key={f.id}
      onClick={() => onSelect(f)}
      className="w-full text-left transition-all"
      style={{
        background: "#1a1e28",
        borderRadius: 10,
        padding: "12px 14px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#1e2330";
        e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3), 0 0 0 1px rgba(232,160,32,0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#1a1e28";
        e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)";
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate" style={{ fontSize: 14, fontWeight: 700, color: "#e8eaf0" }}>{f.name}</p>
          <p className="truncate" style={{ fontSize: 11, color: "#8b909e", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
            <Users style={{ width: 11, height: 11 }} /> {f.__gymName || "Independent"}
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <span style={{
            display: "inline-block", fontSize: 10, fontWeight: 600, color: "#e8a020",
            background: "rgba(232,160,32,0.1)", borderRadius: 4, padding: "2px 8px",
          }}>
            {formatEnum(f.weight_class)}
          </span>
          <p style={{ fontSize: 12, color: "#e8eaf0", fontWeight: 700, marginTop: 4 }}>
            {f.record_wins}-{f.record_losses}-{f.record_draws}
          </p>
        </div>
      </div>
    </button>
  );

  const SectionDivider = ({ icon: Icon, label, count }: { icon: any; label: string; count: number }) => (
    <div className="flex items-center gap-2" style={{ padding: "4px 0" }}>
      <Icon style={{ width: 12, height: 12, color: "#e8a020" }} />
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#e8a020" }}>
        {label}
      </span>
      <span style={{ fontSize: 10, color: "#555b6b" }}>· {count}</span>
      <div style={{ flex: 1, height: 1, background: "rgba(232,160,32,0.15)", marginLeft: 8 }} />
    </div>
  );

  return (
    <div className="space-y-3">
      <Label className="text-xs">{label}</Label>

      {/* Filter bar */}
      <div
        style={{
          background: "#111318", padding: "8px 0",
          boxShadow: "0 1px 0 rgba(255,255,255,0.04)",
          position: "sticky", top: 0, zIndex: 20,
        }}
        className="space-y-2"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search fighters by name..."
            value={name}
            onChange={(e) => { setName(e.target.value); setPage(0); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Select value={weightClass} onValueChange={(v) => { setWeightClass(v); setPage(0); }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Weight class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All weights</SelectItem>
              {Constants.public.Enums.weight_class.map((wc) => (
                <SelectItem key={wc} value={wc}>{formatEnum(wc)}</SelectItem>
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
          <SearchableCountrySelect value={country} onValueChange={(v) => { setCountry(v); setPage(0); }} includeAll />
          <div className="relative">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Gym name..."
              value={gymSearch}
              onChange={(e) => { setGymSearch(e.target.value); setPage(0); }}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={coachNominated} onCheckedChange={(v) => { setCoachNominated(v); setPage(0); }} id={`coach-nom-${label}`} />
          <Label htmlFor={`coach-nom-${label}`} className="text-xs text-muted-foreground cursor-pointer">
            {coachId ? "My fighters only" : "Coach-nominated only"}
          </Label>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground p-4 text-center">Loading fighters...</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground p-4 text-center">No fighters found</p>
        ) : (
          <>
            {suggested.length > 0 && (
              <div className="space-y-2">
                <SectionDivider icon={Sparkles} label="Algorithm-suggested for this slot" count={suggested.length} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggested.map((f) => <FighterCard key={f.id} f={f} />)}
                </div>
              </div>
            )}
            {browseList.length > 0 && (
              <div className="space-y-2">
                <SectionDivider icon={Users} label={suggested.length > 0 ? "Browse all fighters" : "All fighters"} count={browseList.length} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {browseList.map((f) => <FighterCard key={f.id} f={f} />)}
                </div>
              </div>
            )}
          </>
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
