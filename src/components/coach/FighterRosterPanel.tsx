import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Search } from "lucide-react";

import { formatEnum } from "@/lib/format";

interface Fighter {
  id: string;
  name: string;
  record_wins: number;
  record_losses: number;
  record_draws: number;
  weight_class: string;
  style: string | null;
  country: string;
  available: boolean;
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
  fighterRecords: Map<string, { wins: number; losses: number; draws: number }>;
  onAddFighter: () => void;
  onAddFightResult: (fighter: { id: string; name: string }) => void;
}

export function FighterRosterPanel({
  fighters,
  gyms,
  fighterGymLinks,
  onAddFighter,
  onAddFightResult,
}: FighterRosterPanelProps) {
  const [selectedGymId, setSelectedGymId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
        <Button size="sm" className="gap-1" onClick={onAddFighter}>
          <Plus className="h-3 w-3" /> Add Fighter
        </Button>
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
          {filteredFighters.map((f) => (
            <div key={f.id} className="rounded-lg border border-border bg-card p-4">
              <p className="font-medium text-foreground">{f.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {f.record_wins}W-{f.record_losses}L-{f.record_draws}D · {formatEnum(f.weight_class)}
              </p>
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
              <Button
                size="sm"
                variant="outline"
                className="mt-3 gap-1 text-xs"
                onClick={() => onAddFightResult({ id: f.id, name: f.name })}
              >
                <FileText className="h-3 w-3" /> Add Fight Result
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
