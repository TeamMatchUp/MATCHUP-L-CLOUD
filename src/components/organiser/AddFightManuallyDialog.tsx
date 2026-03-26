import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Sparkles } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { formatEnum } from "@/lib/format";
import { MatchSuggestionsPanel } from "./MatchSuggestionsPanel";

type FighterProfile = Database["public"]["Tables"]["fighter_profiles"]["Row"];

interface AddFightManuallyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  sectionType: "Main Event" | "Undercard";
  nextSlotNumber: number;
  onSuccess: () => void;
  existingProposalFighterIds?: string[];
  fightSlot?: Database["public"]["Tables"]["fight_slots"]["Row"] | null;
}

export function AddFightManuallyDialog({ open, onOpenChange, eventId, sectionType, nextSlotNumber, onSuccess, existingProposalFighterIds = [], fightSlot }: AddFightManuallyDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [fighterA, setFighterA] = useState<FighterProfile | null>(null);
  const [fighterB, setFighterB] = useState<FighterProfile | null>(null);
  const [weightClass, setWeightClass] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: resultsA = [] } = useQuery({
    queryKey: ["fighter-search-a", searchA],
    queryFn: async () => {
      if (!searchA.trim()) return [];
      const { data } = await supabase.from("fighter_profiles").select("*").ilike("name", `%${searchA.trim()}%`).eq("available", true).limit(10);
      return data ?? [];
    },
    enabled: searchA.trim().length > 1,
  });

  const { data: resultsB = [] } = useQuery({
    queryKey: ["fighter-search-b", searchB],
    queryFn: async () => {
      if (!searchB.trim()) return [];
      const { data } = await supabase.from("fighter_profiles").select("*").ilike("name", `%${searchB.trim()}%`).eq("available", true).limit(10);
      return data ?? [];
    },
    enabled: searchB.trim().length > 1,
  });

  const handleSave = async () => {
    if (!fighterA || !fighterB) {
      toast({ title: "Select both fighters", variant: "destructive" });
      return;
    }
    setLoading(true);
    const wc = weightClass || fighterA.weight_class || fighterB.weight_class || null;
    const { error } = await supabase.from("event_fight_slots").insert({
      event_id: eventId,
      slot_number: nextSlotNumber,
      fighter_a_id: fighterA.id,
      fighter_b_id: fighterB.id,
      weight_class: wc,
      bout_type: sectionType,
      status: "confirmed",
      is_public: true,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error adding fight", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Fight added to card" });
      setFighterA(null);
      setFighterB(null);
      setSearchA("");
      setSearchB("");
      setWeightClass("");
      onSuccess();
      onOpenChange(false);
    }
  };

  const handleSuggestionSelect = (a: FighterProfile, b: FighterProfile) => {
    setFighterA(a);
    setFighterB(b);
    setWeightClass(a.weight_class || b.weight_class || "");
    setShowSuggestions(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            Add Fight — <span className="text-primary">{sectionType}</span>
          </DialogTitle>
        </DialogHeader>

        {showSuggestions && fightSlot ? (
          <div>
            <MatchSuggestionsPanel
              slot={fightSlot}
              existingProposalFighterIds={existingProposalFighterIds}
              onSelectPair={handleSuggestionSelect}
            />
            <Button variant="ghost" size="sm" onClick={() => setShowSuggestions(false)} className="mt-2">Back to manual search</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {fightSlot && (
              <Button variant="outline" size="sm" className="gap-1 w-full" onClick={() => setShowSuggestions(true)}>
                <Sparkles className="h-3 w-3" /> Get Match Suggestions
              </Button>
            )}

            {/* Fighter A */}
            <div className="space-y-1">
              <Label className="text-xs">Fighter A</Label>
              {fighterA ? (
                <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 p-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{fighterA.name}</p>
                    <p className="text-xs text-muted-foreground">{formatEnum(fighterA.weight_class)} · {fighterA.record_wins}W-{fighterA.record_losses}L</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setFighterA(null); setSearchA(""); }}>Change</Button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search fighter..." value={searchA} onChange={(e) => setSearchA(e.target.value)} className="pl-8 h-9 text-sm" />
                  </div>
                  {resultsA.length > 0 && (
                    <div className="border border-border rounded-md mt-1 max-h-40 overflow-y-auto">
                      {resultsA.map((f) => (
                        <button key={f.id} onClick={() => { setFighterA(f); setSearchA(""); if (!weightClass) setWeightClass(f.weight_class); }} className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex justify-between items-center">
                          <span className="text-foreground">{f.name}</span>
                          <span className="text-xs text-muted-foreground">{formatEnum(f.weight_class)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fighter B */}
            <div className="space-y-1">
              <Label className="text-xs">Fighter B</Label>
              {fighterB ? (
                <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 p-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{fighterB.name}</p>
                    <p className="text-xs text-muted-foreground">{formatEnum(fighterB.weight_class)} · {fighterB.record_wins}W-{fighterB.record_losses}L</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setFighterB(null); setSearchB(""); }}>Change</Button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search fighter..." value={searchB} onChange={(e) => setSearchB(e.target.value)} className="pl-8 h-9 text-sm" />
                  </div>
                  {resultsB.length > 0 && (
                    <div className="border border-border rounded-md mt-1 max-h-40 overflow-y-auto">
                      {resultsB.filter((f) => f.id !== fighterA?.id).map((f) => (
                        <button key={f.id} onClick={() => { setFighterB(f); setSearchB(""); }} className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex justify-between items-center">
                          <span className="text-foreground">{f.name}</span>
                          <span className="text-xs text-muted-foreground">{formatEnum(f.weight_class)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={loading || !fighterA || !fighterB}>
                {loading ? "Adding..." : "Add to Card"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
