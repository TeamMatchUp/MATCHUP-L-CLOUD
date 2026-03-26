import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { FighterSearchDropdown } from "./FighterSearchDropdown";
import { MatchSuggestionsPanel } from "./MatchSuggestionsPanel";
import { useAuth } from "@/contexts/AuthContext";

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

async function notifyBoutParties(fighterA: FighterProfile, fighterB: FighterProfile, eventId: string, slotId: string) {
  // Gather all user_ids and coach_ids to notify
  const notifyIds = new Set<string>();
  if (fighterA.user_id) notifyIds.add(fighterA.user_id);
  if (fighterB.user_id) notifyIds.add(fighterB.user_id);
  if (fighterA.created_by_coach_id) notifyIds.add(fighterA.created_by_coach_id);
  if (fighterB.created_by_coach_id) notifyIds.add(fighterB.created_by_coach_id);

  // Also find coaches via gym links
  const { data: gymLinks } = await supabase
    .from("fighter_gym_links")
    .select("fighter_id, gym:gyms(coach_id)")
    .in("fighter_id", [fighterA.id, fighterB.id])
    .eq("status", "approved");

  (gymLinks ?? []).forEach((link: any) => {
    const gym = Array.isArray(link.gym) ? link.gym[0] : link.gym;
    if (gym?.coach_id) notifyIds.add(gym.coach_id);
  });

  // Get event title
  const { data: evt } = await supabase.from("events").select("title").eq("id", eventId).single();
  const eventTitle = evt?.title ?? "an event";

  const promises = Array.from(notifyIds).map((uid) =>
    supabase.rpc("create_notification", {
      _user_id: uid,
      _title: "New Fight Proposal",
      _message: `${fighterA.name} vs ${fighterB.name} has been proposed for ${eventTitle}.`,
      _type: "match_proposed" as any,
      _reference_id: slotId,
    })
  );
  await Promise.all(promises);
}

export function AddFightManuallyDialog({ open, onOpenChange, eventId, sectionType, nextSlotNumber, onSuccess, existingProposalFighterIds = [], fightSlot }: AddFightManuallyDialogProps) {
  const { toast } = useToast();
  const { user, effectiveRoles } = useAuth();
  const isCoach = effectiveRoles.includes("coach");
  const [loading, setLoading] = useState(false);
  const [fighterA, setFighterA] = useState<FighterProfile | null>(null);
  const [fighterB, setFighterB] = useState<FighterProfile | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSave = async () => {
    if (!fighterA || !fighterB) {
      toast({ title: "Select both fighters", variant: "destructive" });
      return;
    }
    setLoading(true);
    const wc = fighterA.weight_class || fighterB.weight_class || null;
    const { data: inserted, error } = await supabase.from("event_fight_slots").insert({
      event_id: eventId,
      slot_number: nextSlotNumber,
      fighter_a_id: fighterA.id,
      fighter_b_id: fighterB.id,
      weight_class: wc,
      bout_type: sectionType,
      status: "proposed",
      is_public: false,
    }).select("id").single();

    if (error) {
      toast({ title: "Error adding fight", description: error.message, variant: "destructive" });
    } else {
      // Send notifications
      if (inserted) {
        await notifyBoutParties(fighterA, fighterB, eventId, inserted.id);
      }
      toast({ title: "Fight proposed — awaiting acceptance from all parties" });
      setFighterA(null);
      setFighterB(null);
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleSuggestionSelect = (a: FighterProfile, b: FighterProfile) => {
    setFighterA(a);
    setFighterB(b);
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
              eventId={eventId}
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

            <FighterSearchDropdown
              label="Fighter A"
              selected={fighterA}
              onSelect={(f) => setFighterA(f)}
              onClear={() => setFighterA(null)}
              excludeId={fighterB?.id}
              coachId={isCoach ? user?.id : null}
            />

            <FighterSearchDropdown
              label="Fighter B"
              selected={fighterB}
              onSelect={(f) => setFighterB(f)}
              onClear={() => setFighterB(null)}
              excludeId={fighterA?.id}
              coachId={isCoach ? user?.id : null}
            />

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={loading || !fighterA || !fighterB}>
                {loading ? "Proposing..." : "Propose Fight"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
