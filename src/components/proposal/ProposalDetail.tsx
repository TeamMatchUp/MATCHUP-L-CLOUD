import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Calendar, MapPin } from "lucide-react";
import { formatEnum } from "@/lib/format";
import {
  applyOutcome,
  evaluateProposal,
  fetchConfirmations,
  getProposalParties,
  recordDecision,
  type ProposalParties,
} from "@/lib/matchProposal";
import { ProposalProgress } from "./ProposalProgress";

interface ProposalDetailProps {
  proposalId: string;
}

export function ProposalDetail({ proposalId }: ProposalDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: parties, isLoading: loadingParties } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => getProposalParties(proposalId),
  });

  const { data: confirmations = [] } = useQuery({
    queryKey: ["proposal-confirmations", proposalId],
    queryFn: () => fetchConfirmations(proposalId),
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`proposal:${proposalId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "confirmations", filter: `match_proposal_id=eq.${proposalId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["proposal-confirmations", proposalId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "match_proposals", filter: `id=eq.${proposalId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [proposalId, queryClient]);

  if (loadingParties) {
    return <div className="p-6 text-sm" style={{ color: "#8b909e" }}>Loading proposal…</div>;
  }
  if (!parties) {
    return <div className="p-6 text-sm" style={{ color: "#8b909e" }}>Proposal not found.</div>;
  }

  const evaluation = evaluateProposal(parties, confirmations);
  const status = evaluation.status === "pending" ? (parties.proposal.status as string) : evaluation.status;
  const final = status === "confirmed" || status === "declined";

  // Identify viewer role on this proposal
  const viewerSide: "A" | "B" | null =
    user?.id === parties.sideA.fighterUserId || user?.id === parties.sideA.coachUserId
      ? "A"
      : user?.id === parties.sideB.fighterUserId || user?.id === parties.sideB.coachUserId
      ? "B"
      : null;
  const viewerRole: "fighter" | "coach" | null =
    user?.id === parties.sideA.fighterUserId || user?.id === parties.sideB.fighterUserId
      ? "fighter"
      : user?.id === parties.sideA.coachUserId || user?.id === parties.sideB.coachUserId
      ? "coach"
      : null;

  const myConfirmation = confirmations.find((c) => c.user_id === user?.id);
  const canAct = !!user && !!viewerRole && !final;

  const handleDecision = async (decision: "accepted" | "declined") => {
    if (!user || !viewerRole) return;
    setBusy(true);
    try {
      const fresh = await recordDecision({
        proposalId,
        userId: user.id,
        role: viewerRole,
        decision,
        comment,
      });
      await applyOutcome(parties, fresh, user.id, decision);
      await queryClient.invalidateQueries({ queryKey: ["proposal-confirmations", proposalId] });
      await queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({
        title: decision === "accepted" ? "You accepted the bout" : "You declined the bout",
      });
      setComment("");
      setShowComment(false);
    } finally {
      setBusy(false);
    }
  };

  const event = parties.event;
  const eventDate = event?.date ? new Date(event.date).toLocaleDateString() : "TBA";
  const slot = parties.eventFightSlot ?? parties.fightSlot;

  const card: React.CSSProperties = {
    background: "#111318",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3)",
  };

  const fighterBlock = (side: "A" | "B") => {
    const s = side === "A" ? parties.sideA : parties.sideB;
    const fp = side === "A" ? parties.proposal.fighter_a_id : parties.proposal.fighter_b_id;
    return (
      <FighterCard key={fp} fighterId={fp} side={side} fallbackName={s.fighterName} viewerSide={viewerSide} />
    );
  };

  return (
    <div className="space-y-4">
      {/* Event header */}
      <div className="rounded-lg p-5" style={card}>
        <p
          className="text-[10px] uppercase tracking-[0.12em] mb-1"
          style={{ color: "#ef4444", fontFamily: "Inter" }}
        >
          Match Proposal
        </p>
        <h1
          className="text-3xl"
          style={{ fontFamily: "Bebas Neue", letterSpacing: "0.04em", color: "#e8eaf0" }}
        >
          {event?.title ?? "Event"}
        </h1>
        <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: "#8b909e", fontFamily: "Inter" }}>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {eventDate}
          </span>
          {event?.venue_name && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {event.venue_name}
              {event?.city ? `, ${event.city}` : ""}
            </span>
          )}
          {event?.discipline && <span>{formatEnum(event.discipline)}</span>}
        </div>
        {parties.proposal.message && (
          <p
            className="mt-3 text-sm italic"
            style={{ color: "#8b909e", fontFamily: "Inter" }}
          >
            "{parties.proposal.message}"
          </p>
        )}
      </div>

      {/* Versus block */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-stretch">
        {fighterBlock("A")}
        <div className="flex md:flex-col items-center justify-center">
          <span
            className="text-2xl"
            style={{ fontFamily: "Bebas Neue", letterSpacing: "0.08em", color: "#ef4444" }}
          >
            VS
          </span>
        </div>
        {fighterBlock("B")}
      </div>

      {/* Bout details */}
      <div className="rounded-lg p-4" style={card}>
        <p
          className="mb-3 text-[11px] uppercase tracking-[0.08em]"
          style={{ color: "#8b909e", fontFamily: "Inter" }}
        >
          Bout Details
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm" style={{ fontFamily: "Inter" }}>
          <DetailItem label="Weight Class" value={slot?.weight_class ? formatEnum(slot.weight_class) : "—"} />
          <DetailItem label="Discipline" value={slot?.discipline ? formatEnum(slot.discipline) : "—"} />
          <DetailItem
            label="Rounds"
            value={
              slot?.rounds
                ? `${slot.rounds}${slot?.round_duration_minutes ? ` × ${slot.round_duration_minutes}min` : ""}`
                : "—"
            }
          />
          <DetailItem
            label="Slot"
            value={slot?.slot_number ? `#${slot.slot_number}` : (slot?.bout_type ?? "—")}
          />
        </div>
      </div>

      {/* Progress */}
      <ProposalProgress
        breakdown={evaluation.breakdown}
        fighterAName={parties.sideA.fighterName}
        fighterBName={parties.sideB.fighterName}
        coachAName={parties.sideA.coachName}
        coachBName={parties.sideB.coachName}
      />

      {/* Status banner */}
      {status === "confirmed" && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", fontFamily: "Inter" }}
        >
          ✓ Bout confirmed by all required parties.
        </div>
      )}
      {status === "declined" && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", fontFamily: "Inter" }}
        >
          ✕ This proposal has been declined.
        </div>
      )}

      {/* Action bar */}
      {canAct && (
        <div className="rounded-lg p-4" style={card}>
          {myConfirmation && (
            <p className="text-xs mb-3" style={{ color: "#8b909e", fontFamily: "Inter" }}>
              Your current response: <strong style={{ color: "#e8eaf0" }}>{myConfirmation.decision}</strong>. You
              can change it below.
            </p>
          )}
          {showComment ? (
            <Textarea
              placeholder="Optional comment for the other parties…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="mb-3"
            />
          ) : (
            <button
              onClick={() => setShowComment(true)}
              className="text-xs mb-3"
              style={{ color: "#8b909e", fontFamily: "Inter" }}
            >
              + Add comment
            </button>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => handleDecision("accepted")}
              disabled={busy}
              className="gap-1"
              style={{ background: "#ef4444", color: "#0d0f12" }}
            >
              <Check className="h-4 w-4" />
              {myConfirmation?.decision === "accepted" ? "Re-confirm Accept" : "Accept Bout"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDecision("declined")}
              disabled={busy}
              className="gap-1"
              style={{ color: "#ef4444" }}
            >
              <X className="h-4 w-4" />
              {myConfirmation?.decision === "declined" ? "Keep Decline" : "Decline"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em] mb-0.5" style={{ color: "#8b909e" }}>
        {label}
      </p>
      <p style={{ color: "#e8eaf0" }}>{value}</p>
    </div>
  );
}

function FighterCard({
  fighterId,
  side,
  fallbackName,
  viewerSide,
}: {
  fighterId: string;
  side: "A" | "B";
  fallbackName: string;
  viewerSide: "A" | "B" | null;
}) {
  const { data: fighter } = useQuery({
    queryKey: ["proposal-fighter", fighterId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_profiles")
        .select(
          "id, name, profile_image, style, weight_class, height, reach, record_wins, record_losses, record_draws",
        )
        .eq("id", fighterId)
        .maybeSingle();
      return data;
    },
  });

  const isViewer = viewerSide === side;
  const card: React.CSSProperties = {
    background: "#111318",
    boxShadow: isViewer
      ? "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(239,68,68,0.25), 0 8px 24px rgba(0,0,0,0.3)"
      : "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.4)",
  };

  return (
    <div className="rounded-lg p-4 flex gap-4 items-center" style={card}>
      <div
        className="rounded-full overflow-hidden shrink-0"
        style={{ width: 72, height: 72, background: "#181c24" }}
      >
        {fighter?.profile_image && (
          <img src={fighter.profile_image} alt={fighter.name} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {isViewer && (
          <p
            className="text-[10px] uppercase tracking-[0.1em] mb-1"
            style={{ color: "#ef4444", fontFamily: "Inter" }}
          >
            Your Side
          </p>
        )}
        <h2
          className="text-xl truncate"
          style={{ fontFamily: "Bebas Neue", letterSpacing: "0.04em", color: "#e8eaf0" }}
        >
          {fighter?.name ?? fallbackName}
        </h2>
        <p className="text-xs mt-1" style={{ color: "#8b909e", fontFamily: "Inter" }}>
          {fighter
            ? `${fighter.record_wins ?? 0}W-${fighter.record_losses ?? 0}L-${fighter.record_draws ?? 0}D`
            : ""}
          {fighter?.style ? ` · ${formatEnum(fighter.style)}` : ""}
        </p>
        {(fighter?.height || fighter?.reach) && (
          <p className="text-xs mt-0.5" style={{ color: "#555b6b", fontFamily: "Inter" }}>
            {fighter?.height ? `Height ${fighter.height}` : ""}
            {fighter?.reach ? ` · Reach ${fighter.reach}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
