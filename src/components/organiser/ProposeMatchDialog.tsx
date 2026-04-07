import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAnalytics } from "@/hooks/useAnalytics";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type FighterProfile = Database["public"]["Tables"]["fighter_profiles"]["Row"];
type FightSlot = Database["public"]["Tables"]["fight_slots"]["Row"];

import { formatEnum } from "@/lib/format";

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
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const { track } = useAnalytics();

  const handlePropose = async () => {
    setLoading(true);

    // Create the match proposal with "pending" status (parallel confirmation)
    const { data: proposal, error: proposalError } = await supabase
      .from("match_proposals")
      .insert({
        fight_slot_id: slot.id,
        fighter_a_id: fighterA.id,
        fighter_b_id: fighterB.id,
        proposed_by: proposedBy,
        status: "pending",
        message: message || null,
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

    // Collect ALL parties to notify: coaches + fighters
    const notifyIds = new Set<string>();

    // Coach IDs from created_by_coach_id
    if (fighterA.created_by_coach_id) notifyIds.add(fighterA.created_by_coach_id);
    if (fighterB.created_by_coach_id) notifyIds.add(fighterB.created_by_coach_id);

    // Fighter user IDs
    if (fighterA.user_id) notifyIds.add(fighterA.user_id);
    if (fighterB.user_id) notifyIds.add(fighterB.user_id);

    // Also check gym coaches
    const { data: gymLinks } = await supabase
      .from("fighter_gym_links")
      .select("gym_id, fighter_id")
      .in("fighter_id", [fighterA.id, fighterB.id])
      .eq("status", "accepted");

    if (gymLinks && gymLinks.length > 0) {
      const gymIds = gymLinks.map((gl) => gl.gym_id);
      const { data: gyms } = await supabase
        .from("gyms")
        .select("coach_id")
        .in("id", gymIds);
      gyms?.forEach((g) => {
        if (g.coach_id) notifyIds.add(g.coach_id);
      });
    }

    // Don't notify the organiser who proposed
    notifyIds.delete(proposedBy);

    // Send notifications to all parties
    const notificationPromises = Array.from(notifyIds).map((uid) =>
      supabase.rpc("create_notification", {
        _user_id: uid,
        _title: "New Match Proposal",
        _message: `${fighterA.name} vs ${fighterB.name} has been proposed. Please review and confirm.`,
        _type: "match_proposed",
        _reference_id: proposal.id,
      })
    );
    await Promise.all(notificationPromises);

    setLoading(false);
    toast({ title: "Match proposed", description: "All coaches and fighters have been notified." });
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
            {(slot as any).card_position === "main_card" ? " · Main Card" : " · Undercard"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 items-stretch">
          <FighterCard fighter={fighterA} label="Fighter A" />
          <div className="flex items-center">
            <span className="font-heading text-xl text-primary">VS</span>
          </div>
          <FighterCard fighter={fighterB} label="Fighter B" />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Message to coaches & fighters (optional)</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Any notes about this matchup..."
            rows={2}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          All coaches and fighters will be notified simultaneously. The match is confirmed once all parties accept.
        </p>

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
