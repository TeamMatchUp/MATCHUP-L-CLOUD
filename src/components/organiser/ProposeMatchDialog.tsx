import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type FighterProfile = Database["public"]["Tables"]["fighter_profiles"]["Row"];
type FightSlot = Database["public"]["Tables"]["fight_slots"]["Row"];

function formatEnum(val: string) {
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ProposeMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: FightSlot;
  fighterA: FighterProfile;
  fighterB: FighterProfile;
  proposedBy: string;
  onSuccess: () => void;
}

function FighterCard({ fighter, label }: { fighter: FighterProfile; label: string }) {
  return (
    <div className="flex-1 rounded-md border border-border bg-muted/30 p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-heading text-xl text-foreground">{fighter.name}</p>
      <p className="text-sm text-muted-foreground mt-1">
        {fighter.record_wins}W - {fighter.record_losses}L - {fighter.record_draws}D
      </p>
      <div className="flex flex-wrap gap-1 mt-2">
        {fighter.style && (
          <Badge variant="outline" className="text-xs">
            {formatEnum(fighter.style)}
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          {fighter.country}
        </Badge>
        {fighter.height && (
          <Badge variant="outline" className="text-xs">
            {fighter.height}
          </Badge>
        )}
      </div>
    </div>
  );
}

export function ProposeMatchDialog({
  open,
  onOpenChange,
  slot,
  fighterA,
  fighterB,
  proposedBy,
  onSuccess,
}: ProposeMatchDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePropose = async () => {
    setLoading(true);

    // Create the match proposal
    const { data: proposal, error: proposalError } = await supabase
      .from("match_proposals")
      .insert({
        fight_slot_id: slot.id,
        fighter_a_id: fighterA.id,
        fighter_b_id: fighterB.id,
        proposed_by: proposedBy,
        status: "pending_coach_a",
      })
      .select("id")
      .single();

    if (proposalError) {
      setLoading(false);
      toast({
        title: "Failed to create proposal",
        description: proposalError.message,
        variant: "destructive",
      });
      return;
    }

    // Update fight slot status
    await supabase
      .from("fight_slots")
      .update({ status: "proposed" })
      .eq("id", slot.id);

    // Send notifications to coaches of both fighters
    const coachIds = new Set<string>();
    if (fighterA.created_by_coach_id) coachIds.add(fighterA.created_by_coach_id);
    if (fighterB.created_by_coach_id) coachIds.add(fighterB.created_by_coach_id);

    // Also check gym coaches
    const { data: gymLinks } = await supabase
      .from("fighter_gym_links")
      .select("gym_id")
      .in("fighter_id", [fighterA.id, fighterB.id]);

    if (gymLinks && gymLinks.length > 0) {
      const gymIds = gymLinks.map((gl) => gl.gym_id);
      const { data: gyms } = await supabase
        .from("gyms")
        .select("coach_id")
        .in("id", gymIds);
      gyms?.forEach((g) => {
        if (g.coach_id) coachIds.add(g.coach_id);
      });
    }

    // Create notifications via security definer function
    for (const coachId of coachIds) {
      await supabase.rpc("create_notification", {
        _user_id: coachId,
        _title: "New Match Proposal",
        _message: `${fighterA.name} vs ${fighterB.name} has been proposed.`,
        _type: "match_proposed",
        _reference_id: proposal.id,
      });
    }

    setLoading(false);
    toast({ title: "Match proposed", description: "Coaches have been notified." });
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            PROPOSE <span className="text-primary">MATCH</span>
          </DialogTitle>
          <DialogDescription>
            Slot #{slot.slot_number} · {formatEnum(slot.weight_class)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 items-stretch">
          <FighterCard fighter={fighterA} label="Fighter A" />
          <div className="flex items-center">
            <span className="font-heading text-xl text-primary">VS</span>
          </div>
          <FighterCard fighter={fighterB} label="Fighter B" />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePropose} disabled={loading}>
            {loading ? "Proposing..." : "Confirm Proposal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
