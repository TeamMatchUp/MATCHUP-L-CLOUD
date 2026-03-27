import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, FileText, Search, Pencil, Trash2, Upload } from "lucide-react";
import { formatEnum } from "@/lib/format";
import { Link } from "react-router-dom";

interface DashboardRosterProps {
  allFighters: any[];
  myGyms: any[];
  fighterGymLinks: any[];
  primaryGymId?: string;
  onAddFighter: () => void;
  onEditFighter: (fighter: any) => void;
  onDeleteFighter: (fighter: { id: string; name: string }) => void;
  onAddFightResult: (fighter: { id: string; name: string }) => void;
  onImportFighters?: () => void;
}

export function DashboardRoster({
  allFighters,
  myGyms,
  fighterGymLinks,
  primaryGymId,
  onAddFighter,
  onEditFighter,
  onDeleteFighter,
  onAddFightResult,
  onImportFighters,
}: DashboardRosterProps) {
  const [rosterGymFilter, setRosterGymFilter] = useState("all");
  const [rosterSearch, setRosterSearch] = useState("");

  // Compute gym names map
  const gymNameMap = useMemo(() => {
    const map = new Map<string, string>();
    myGyms.forEach((g) => map.set(g.id, g.name));
    return map;
  }, [myGyms]);

  const filteredFighters = useMemo(() => {
    let result = allFighters;
    if (rosterGymFilter !== "all") {
      const idsInGym = new Set(
        fighterGymLinks
          .filter((l: any) => l.gym_id === rosterGymFilter)
          .map((l: any) => l.fighter_id)
      );
      result = result.filter((f: any) => idsInGym.has(f.id));
    }
    if (rosterSearch.trim()) {
      const q = rosterSearch.toLowerCase().trim();
      result = result.filter(
        (f: any) =>
          f.name.toLowerCase().includes(q) ||
          formatEnum(f.weight_class).toLowerCase().includes(q) ||
          (f.style && formatEnum(f.style).toLowerCase().includes(q)) ||
          f.country.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allFighters, rosterGymFilter, rosterSearch, fighterGymLinks]);

  // Get gym affiliation for a fighter
  const getFighterGym = (fighterId: string) => {
    const link = fighterGymLinks.find((l: any) => l.fighter_id === fighterId);
    return link ? gymNameMap.get(link.gym_id) : undefined;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {onImportFighters && (
            <Button size="sm" variant="outline" className="gap-1" onClick={onImportFighters}>
              <Upload className="h-3 w-3" /> Import CSV
            </Button>
          )}
          <Button size="sm" className="gap-1" onClick={onAddFighter} disabled={myGyms.length === 0}>
            <Plus className="h-3 w-3" /> Add Fighter
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fighters..."
            value={rosterSearch}
            onChange={(e) => setRosterSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {myGyms.length > 0 && (
          <Select value={rosterGymFilter} onValueChange={setRosterGymFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by gym" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Gyms</SelectItem>
              {myGyms.map((g: any) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {allFighters.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground mb-4">No fighters in your roster yet.</p>
          <Button onClick={onAddFighter} className="gap-1">
            <Plus className="h-4 w-4" /> Add Your First Fighter
          </Button>
        </div>
      ) : filteredFighters.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No fighters match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredFighters.map((f: any) => {
            const gymName = getFighterGym(f.id);
            return (
              <div key={f.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-heading text-sm text-primary overflow-hidden shrink-0">
                    {f.profile_image ? (
                      <img src={f.profile_image} alt={f.name} className="h-full w-full object-cover" />
                    ) : (
                      f.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.record_wins}W-{f.record_losses}L-{f.record_draws}D · {formatEnum(f.weight_class)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {f.style && (
                    <Badge variant="outline" className="text-xs">
                      {formatEnum(f.style)}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {f.country}
                  </Badge>
                  {gymName && (
                    <Badge variant="outline" className="text-xs">
                      {gymName}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs flex-1"
                    onClick={() => onEditFighter(f)}
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs flex-1"
                    onClick={() => onAddFightResult({ id: f.id, name: f.name })}
                  >
                    <FileText className="h-3 w-3" /> Add Result
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs text-destructive hover:text-destructive"
                    onClick={() => onDeleteFighter({ id: f.id, name: f.name })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
