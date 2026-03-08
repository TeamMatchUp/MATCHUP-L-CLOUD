import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";

function formatEnum(val: string) {
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ProposalCardProps {
  proposal: any;
  userId: string;
  userRole: "coach" | "fighter";
  coachFighterIds: string[];
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

  // Fetch existing confirmations for this proposal
  const { data: existingConfirmations = [] } = useQuery({
    queryKey: ["proposal-confirmations", proposal.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("confirmations")
        .select("*")
        .eq("match_proposal_id", proposal.id);
      return data ?? [];
    },
  });

  // Check if this user has already confirmed
  const hasAlreadyConfirmed = existingConfirmations.some(
    (c) => c.user_id === userId
  );

  // Can act if proposal is pending and user hasn't confirmed yet
  const canAct = proposal.status === "pending" && !hasAlreadyConfirmed;

  const acceptedCount = existingConfirmations.filter(
    (c) => c.decision === "accepted"
  ).length;

  const handleAccept = async () => {
    setLoading(true);

    // Insert confirmation
    await supabase.from("confirmations").insert({
      match_proposal_id: proposal.id,
      user_id: userId,
      role: userRole,
      decision: "accepted",
      comment: comment || null,
    });

    // Check if all 4 parties have now confirmed
    const newAcceptedCount = acceptedCount + 1;

    // Count required parties (coach_a, coach_b, fighter_a, fighter_b)
    // We need to check how many unique parties exist
    const requiredParties = new Set<string>();
    if (fighterA?.created_by_coach_id) requiredParties.add(fighterA.created_by_coach_id);
    if (fighterB?.created_by_coach_id) requiredParties.add(fighterB.created_by_coach_id);
    if (fighterA?.user_id) requiredParties.add(fighterA.user_id);
    if (fighterB?.user_id) requiredParties.add(fighterB.user_id);

    // Also check gym coaches
    const { data: gymLinks } = await supabase
      .from("fighter_gym_links")
      .select("gym_id, fighter_id")
      .in("fighter_id", [proposal.fighter_a_id, proposal.fighter_b_id])
      .eq("status", "accepted");

    if (gymLinks && gymLinks.length > 0) {
      const gymIds = gymLinks.map((gl) => gl.gym_id);
      const { data: gyms } = await supabase
        .from("gyms")
        .select("coach_id")
        .in("id", gymIds);
      gyms?.forEach((g) => {
        if (g.coach_id) requiredParties.add(g.coach_id);
      });
    }

    // Remove organiser from required parties
    requiredParties.delete(proposal.proposed_by);

    // Re-fetch confirmations to get accurate count
    const { data: allConfs } = await supabase
      .from("confirmations")
      .select("user_id")
      .eq("match_proposal_id", proposal.id)
      .eq("decision", "accepted");

    const confirmedUserIds = new Set((allConfs ?? []).map((c) => c.user_id));
    const allConfirmed = Array.from(requiredParties).every((id) =>
      confirmedUserIds.has(id)
    );

    if (allConfirmed) {
      // All parties confirmed - update proposal and slot
      await supabase
        .from("match_proposals")
        .update({ status: "confirmed" })
        .eq("id", proposal.id);

      await supabase
        .from("fight_slots")
        .update({ status: "confirmed" })
        .eq("id", proposal.fight_slot_id);

      // Notify all parties
      const notifyIds = new Set(requiredParties);
      notifyIds.add(proposal.proposed_by);
      notifyIds.delete(userId);

      const promises = Array.from(notifyIds).map((nid) =>
        supabase.rpc("create_notification", {
          _user_id: nid,
          _title: "Match Confirmed!",
          _message: `${fighterA?.name} vs ${fighterB?.name} is confirmed for ${eventTitle}.`,
          _type: "match_confirmed",
          _reference_id: proposal.id,
        })
      );
      await Promise.all(promises);

      toast({ title: "Match confirmed!", description: "All parties have accepted." });
    } else {
      toast({ title: "Accepted", description: `Waiting for ${requiredParties.size - confirmedUserIds.size} more confirmation(s).` });
    }

    setLoading(false);
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

    await supabase
      .from("fight_slots")
      .update({ status: "open" })
      .eq("id", proposal.fight_slot_id);

    // Notify organiser and all other parties
    const notifyIds = new Set<string>();
    notifyIds.add(proposal.proposed_by);
    if (fighterA?.created_by_coach_id) notifyIds.add(fighterA.created_by_coach_id);
    if (fighterB?.created_by_coach_id) notifyIds.add(fighterB.created_by_coach_id);
    if (fighterA?.user_id) notifyIds.add(fighterA.user_id);
    if (fighterB?.user_id) notifyIds.add(fighterB.user_id);
    notifyIds.delete(userId);

    const promises = Array.from(notifyIds).map((nid) =>
      supabase.rpc("create_notification", {
        _user_id: nid,
        _title: "Match Proposal Declined",
        _message: `${fighterA?.name} vs ${fighterB?.name} was declined.`,
        _type: "match_declined",
        _reference_id: proposal.id,
      })
    );
    await Promise.all(promises);

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
          {proposal.status === "pending"
            ? `${acceptedCount}/${existingConfirmations.length > 0 ? "?" : "4"} confirmed`
            : formatEnum(proposal.status)}
        </Badge>
      </div>

      <div className="flex items-center gap-3 mb-3">
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

      {/* Confirmation progress */}
      {proposal.status === "pending" && existingConfirmations.length > 0 && (
        <div className="flex gap-1 mb-3 flex-wrap">
          {existingConfirmations.map((c: any) => (
            <Badge
              key={c.id}
              variant="outline"
              className={
                c.decision === "accepted"
                  ? "text-[10px] bg-success/10 text-success border-success/30"
                  : "text-[10px] bg-destructive/10 text-destructive border-destructive/30"
              }
            >
              {formatEnum(c.role)} {c.decision}
            </Badge>
          ))}
        </div>
      )}

      {hasAlreadyConfirmed && proposal.status === "pending" && (
        <p className="text-xs text-success mb-2">✓ You have confirmed. Waiting for others.</p>
      )}

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
              <Check className="h-3 w-3" /> Accept
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

      {proposal.message && (
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border italic">
          "{proposal.message}"
        </p>
      )}
    </div>
  );
}
