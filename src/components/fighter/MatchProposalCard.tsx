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

interface MatchProposalCardProps {
  proposal: any;
  fighterProfileId: string;
  userId: string;
  onActionComplete: () => void;
}

export function MatchProposalCard({
  proposal,
  fighterProfileId,
  userId,
  onActionComplete,
}: MatchProposalCardProps) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const { toast } = useToast();

  const fighterA = proposal.fighter_a;
  const fighterB = proposal.fighter_b;
  const eventTitle = proposal.fight_slot?.events?.title || "Event";
  const eventDate = proposal.fight_slot?.events?.date || "";
  const slotNumber = proposal.fight_slot?.slot_number || "?";
  const weightClass = proposal.fight_slot?.weight_class || "";

  const isA = proposal.fighter_a_id === fighterProfileId;
  const opponent = isA ? fighterB : fighterA;

  // Can act?
  const canAct =
    (proposal.status === "pending_fighter_a" && isA) ||
    (proposal.status === "pending_fighter_b" && !isA);

  const handleAccept = async () => {
    setLoading(true);

    await supabase.from("confirmations").insert({
      match_proposal_id: proposal.id,
      user_id: userId,
      role: "fighter",
      decision: "accepted",
      comment: comment || null,
    });

    let nextStatus: MatchStatus;
    if (proposal.status === "pending_fighter_a") {
      nextStatus = "pending_fighter_b";
    } else {
      nextStatus = "confirmed";
    }

    await supabase
      .from("match_proposals")
      .update({ status: nextStatus })
      .eq("id", proposal.id);

    if (nextStatus === "confirmed") {
      // Update fight slot
      await supabase
        .from("fight_slots")
        .update({ status: "confirmed" })
        .eq("id", proposal.fight_slot_id);

      // Notify all parties
      const notifyIds = new Set<string>();
      notifyIds.add(proposal.proposed_by);
      if (fighterA?.created_by_coach_id) notifyIds.add(fighterA.created_by_coach_id);
      if (fighterB?.created_by_coach_id) notifyIds.add(fighterB.created_by_coach_id);
      if (fighterA?.user_id) notifyIds.add(fighterA.user_id);
      if (fighterB?.user_id) notifyIds.add(fighterB.user_id);
      notifyIds.delete(userId); // don't notify self

      for (const nid of notifyIds) {
        await supabase.rpc("create_notification", {
          _user_id: nid,
          _title: "Match Confirmed!",
          _message: `${fighterA?.name} vs ${fighterB?.name} is confirmed for ${eventTitle}.`,
          _type: "match_confirmed",
          _reference_id: proposal.id,
        });
      }
    } else if (nextStatus === "pending_fighter_b" && fighterB?.user_id) {
      await supabase.rpc("create_notification", {
        _user_id: fighterB.user_id,
        _title: "Match Proposal Awaiting Your Confirmation",
        _message: `${fighterA?.name} has accepted. Now it's your turn.`,
        _type: "match_accepted",
        _reference_id: proposal.id,
      });
    }

    setLoading(false);
    toast({ title: nextStatus === "confirmed" ? "Match confirmed!" : "Accepted" });
    onActionComplete();
  };

  const handleDecline = async () => {
    setLoading(true);

    await supabase.from("confirmations").insert({
      match_proposal_id: proposal.id,
      user_id: userId,
      role: "fighter",
      decision: "declined",
      comment: comment || null,
    });

    await supabase
      .from("match_proposals")
      .update({ status: "declined" })
      .eq("id", proposal.id);

    await supabase
      .from("fight_slots")
      .update({ status: "open" })
      .eq("id", proposal.fight_slot_id);

    // Notify organiser + coaches
    const notifyIds = new Set<string>();
    notifyIds.add(proposal.proposed_by);
    if (fighterA?.created_by_coach_id) notifyIds.add(fighterA.created_by_coach_id);
    if (fighterB?.created_by_coach_id) notifyIds.add(fighterB.created_by_coach_id);
    notifyIds.delete(userId);

    for (const nid of notifyIds) {
      await supabase.rpc("create_notification", {
        _user_id: nid,
        _title: "Match Declined",
        _message: `${fighterA?.name} vs ${fighterB?.name} was declined by a fighter.`,
        _type: "match_declined",
        _reference_id: proposal.id,
      });
    }

    setLoading(false);
    toast({ title: "Proposal declined" });
    onActionComplete();
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {eventTitle} · {eventDate} · Slot #{slotNumber}
          </p>
          <p className="text-xs text-muted-foreground">{formatEnum(weightClass)}</p>
        </div>
        <Badge
          variant="outline"
          className={
            proposal.status === "confirmed"
              ? "bg-success/20 text-success border-success/30"
              : ""
          }
        >
          {formatEnum(proposal.status)}
        </Badge>
      </div>

      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-1">Your Opponent</p>
        <p className="font-heading text-xl text-foreground">{opponent?.name || "TBD"}</p>
        <p className="text-sm text-muted-foreground">
          {opponent?.record_wins}W-{opponent?.record_losses}L-{opponent?.record_draws}D
          {opponent?.style && ` · ${formatEnum(opponent.style)}`}
          {opponent?.height && ` · ${opponent.height}`}
          {opponent?.reach && ` · ${opponent.reach} reach`}
        </p>
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
            <Button size="sm" onClick={handleAccept} disabled={loading} className="gap-1">
              <Check className="h-3 w-3" /> Accept Fight
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDecline}
              disabled={loading}
              className="gap-1 text-destructive hover:text-destructive"
            >
              <X className="h-3 w-3" /> Decline
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
