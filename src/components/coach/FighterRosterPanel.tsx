import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Search, ShieldCheck, UserCheck, Upload, Pencil } from "lucide-react";
import { EditFighterDialog } from "./EditFighterDialog";
import { formatEnum } from "@/lib/format";

interface Fighter {
  id: string;
  name: string;
  email: string | null;
  record_wins: number;
  record_losses: number;
  record_draws: number;
  weight_class: string;
  style: string | null;
  country: string;
  available: boolean;
  height: number | null;
  reach: number | null;
  bio: string | null;
  profile_image: string | null;
}

interface Gym {
  id: string;
  name: string;
}

interface FighterGymLink {
  fighter_id: string;
  gym_id: string;
}

interface FighterRosterPanelProps {
  fighters: Fighter[];
  gyms: Gym[];
  fighterGymLinks: FighterGymLink[];
  fighterRecords: Map<string, { wins: number; losses: number; draws: number; eventVerified: number; coachVerified: number }>;
  onAddFighter: () => void;
  onAddFightResult: (fighter: { id: string; name: string }) => void;
  onImportFighters?: () => void;
}

export function FighterRosterPanel({
  fighters,
  gyms,
  fighterGymLinks,
  fighterRecords,
  onAddFighter,
  onAddFightResult,
  onImportFighters,
}: FighterRosterPanelProps) {
  const [selectedGymId, setSelectedGymId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingFighter, setEditingFighter] = useState<any>(null);

  const filteredFighters = useMemo(() => {
    let result = fighters;

    // Filter by gym
    if (selectedGymId !== "all") {
      const fighterIdsInGym = new Set(
        fighterGymLinks
          .filter((link) => link.gym_id === selectedGymId)
          .map((link) => link.fighter_id)
      );
      result = result.filter((f) => fighterIdsInGym.has(f.id));
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          formatEnum(f.weight_class).toLowerCase().includes(q) ||
          (f.style && formatEnum(f.style).toLowerCase().includes(q)) ||
          f.country.toLowerCase().includes(q)
      );
    }

    return result;
  }, [fighters, selectedGymId, searchQuery, fighterGymLinks]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-2xl text-foreground">
          FIGHTER <span className="text-primary">ROSTER</span>
        </h2>
        <div className="flex gap-2">
          {onImportFighters && (
            <Button size="sm" variant="outline" className="gap-1" onClick={onImportFighters}>
              <Upload className="h-3 w-3" /> Import CSV
            </Button>
          )}
          <Button size="sm" className="gap-1" onClick={onAddFighter}>
            <Plus className="h-3 w-3" /> Add Fighter
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fighters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedGymId} onValueChange={setSelectedGymId}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by gym" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Gyms</SelectItem>
            {gyms.map((gym) => (
              <SelectItem key={gym.id} value={gym.id}>
                {gym.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {fighters.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center mb-8">
          <p className="text-muted-foreground mb-4">No fighters linked to your account yet.</p>
          <Button onClick={onAddFighter} className="gap-1">
            <Plus className="h-4 w-4" /> Add Your First Fighter
          </Button>
        </div>
      ) : filteredFighters.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center mb-8">
          <p className="text-muted-foreground">No fighters match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
          {filteredFighters.map((f) => {
            const record = fighterRecords.get(f.id) || { wins: 0, losses: 0, draws: 0, eventVerified: 0, coachVerified: 0 };
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
                    {record.wins}W-{record.losses}L-{record.draws}D · {formatEnum(f.weight_class)}
                  </p>
                </div>
              </div>
              {(record.eventVerified > 0 || record.coachVerified > 0) && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {record.eventVerified > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-primary">
                      <ShieldCheck className="h-3 w-3" /> {record.eventVerified} Event Verified
                    </span>
                  )}
                  {record.coachVerified > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <UserCheck className="h-3 w-3" /> {record.coachVerified} Coach Verified
                    </span>
                  )}
                </div>
              )}
              <div className="flex gap-1 mt-2 flex-wrap">
                {f.style && (
                  <Badge variant="outline" className="text-xs">{formatEnum(f.style)}</Badge>
                )}
                <Badge variant="outline" className="text-xs">{f.country}</Badge>
                <Badge
                  variant="outline"
                  className={`text-xs ${f.available ? "text-success border-success/30" : "text-destructive border-destructive/30"}`}
                >
                  {f.available ? "Available" : "Unavailable"}
                </Badge>
              </div>
              <div className="flex gap-1 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => onAddFightResult({ id: f.id, name: f.name })}
                >
                  <FileText className="h-3 w-3" /> Add Result
                </Button>
                {/* (5) Full edit button */}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => setEditingFighter(f)}
                >
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
              </div>
            </div>
          )})}
        </div>
      )}

      {/* (5) Full profile edit modal */}
      {editingFighter && (
        <EditFighterDialog
          open={!!editingFighter}
          onOpenChange={(open) => { if (!open) setEditingFighter(null); }}
          fighter={editingFighter}
          onSuccess={() => { setEditingFighter(null); onAddFightResult({ id: "", name: "" }); /* trigger refresh */ }}
        />
      )}
    </div>
  );
}
