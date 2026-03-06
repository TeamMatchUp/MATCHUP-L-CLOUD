import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type MatchStatus = Database["public"]["Enums"]["match_status"];

function formatEnum(val: string) {
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ProposalCardProps {
  proposal: any; // joined proposal with fighter_a, fighter_b, fight_slot, event
  userId: string;
  userRole: "coach" | "fighter";
  coachFighterIds: string[]; // fighter IDs belonging to this coach
  onActionComplete: () => void;
}

export function ProposalCard({
  proposal,
  userId,
  userRole,
  coachFighterIds,
  onActionComplete,
}: ProposalCardProps) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const { toast } = useToast();

  const fighterA = proposal.fighter_a;
  const fighterB = proposal.fighter_b;
  const eventTitle = proposal.fight_slot?.events?.title || "Event";
  const slotNumber = proposal.fight_slot?.slot_number || "?";
  const weightClass = proposal.fight_slot?.weight_class || "";

  // Determine which side this coach controls
  const coachSideA = coachFighterIds.includes(proposal.fighter_a_id);
  const coachSideB = coachFighterIds.includes(proposal.fighter_b_id);

  // Status progression
  const getNextStatus = (currentStatus: MatchStatus): MatchStatus | null => {
    if (userRole === "coach") {
      if (currentStatus === "pending_coach_a" && coachSideA) return "pending_coach_b";
      if (currentStatus === "pending_coach_b" && coachSideB) return "pending_fighter_a";
      // If coach is same for both fighters
      if (currentStatus === "pending_coach_a" && coachSideB) return null; // not their turn
      if (currentStatus === "pending_coach_b" && coachSideA) return null; // not their turn
    }
    return null;
  };

  const nextStatus = getNextStatus(proposal.status);
  const canAct = nextStatus !== null;

  const handleAccept = async () => {
    if (!nextStatus) return;
    setLoading(true);

    // Insert confirmation
    await supabase.from("confirmations").insert({
      match_proposal_id: proposal.id,
      user_id: userId,
      role: userRole,
      decision: "accepted",
      comment: comment || null,
    });

    // Update proposal status
    await supabase
      .from("match_proposals")
      .update({ status: nextStatus })
      .eq("id", proposal.id);

    // Notify next party
    if (nextStatus === "pending_coach_b" && fighterB?.created_by_coach_id) {
      await supabase.rpc("create_notification", {
        _user_id: fighterB.created_by_coach_id,
        _title: "Match Proposal Awaiting Your Review",
        _message: `${fighterA?.name} vs ${fighterB?.name} — Coach A has approved. Your turn.`,
        _type: "match_accepted",
        _reference_id: proposal.id,
      });
    } else if (nextStatus === "pending_fighter_a" && fighterA?.user_id) {
      await supabase.rpc("create_notification", {
        _user_id: fighterA.user_id,
        _title: "Match Proposal Awaiting Your Confirmation",
        _message: `You have been proposed to fight ${fighterB?.name}. Both coaches approved.`,
        _type: "match_accepted",
        _reference_id: proposal.id,
      });
    }

    setLoading(false);
    toast({ title: "Proposal accepted" });
    onActionComplete();
  };

  const handleDecline = async () => {
    setLoading(true);

    await supabase.from("confirmations").insert({
      match_proposal_id: proposal.id,
      user_id: userId,
      role: userRole,
      decision: "declined",
      comment: comment || null,
    });

    await supabase
      .from("match_proposals")
      .update({ status: "declined" })
      .eq("id", proposal.id);

    // Reset fight slot to open
    await supabase
      .from("fight_slots")
      .update({ status: "open" })
      .eq("id", proposal.fight_slot_id);

    // Notify organiser
    await supabase.rpc("create_notification", {
      _user_id: proposal.proposed_by,
      _title: "Match Proposal Declined",
      _message: `${fighterA?.name} vs ${fighterB?.name} was declined.`,
      _type: "match_declined",
      _reference_id: proposal.id,
    });

    setLoading(false);
    toast({ title: "Proposal declined" });
    onActionComplete();
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground">{eventTitle} · Slot #{slotNumber}</p>
          <p className="text-xs text-muted-foreground">{formatEnum(weightClass)}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {formatEnum(proposal.status)}
        </Badge>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <p className="font-heading text-lg text-foreground">{fighterA?.name || "TBD"}</p>
          <p className="text-xs text-muted-foreground">
            {fighterA?.record_wins}W-{fighterA?.record_losses}L-{fighterA?.record_draws}D
            {fighterA?.style && ` · ${formatEnum(fighterA.style)}`}
          </p>
        </div>
        <span className="font-heading text-lg text-primary">VS</span>
        <div className="flex-1 text-right">
          <p className="font-heading text-lg text-foreground">{fighterB?.name || "TBD"}</p>
          <p className="text-xs text-muted-foreground">
            {fighterB?.record_wins}W-{fighterB?.record_losses}L-{fighterB?.record_draws}D
            {fighterB?.style && ` · ${formatEnum(fighterB.style)}`}
          </p>
        </div>
      </div>

      {canAct && (
        <div className="space-y-3">
          {showComment ? (
            <Textarea
              placeholder="Optional comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
          ) : (
            <button
              onClick={() => setShowComment(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              + Add comment
            </button>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={loading}
              className="gap-1"
            >
              <Check className="h-3 w-3" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDecline}
              disabled={loading}
              className="gap-1 text-destructive hover:text-destructive"
            >
              <X className="h-3 w-3" />
              Decline
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
