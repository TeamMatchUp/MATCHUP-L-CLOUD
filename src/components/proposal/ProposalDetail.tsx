import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, X, ArrowLeft } from "lucide-react";
import { formatEnum } from "@/lib/format";
import {
  applyOutcome,
  evaluateProposal,
  fetchConfirmations,
  getProposalParties,
  recordDecision,
  type ConfirmationRow,
  type ProposalParties,
  type ProposalSide,
} from "@/lib/matchProposal";

interface ProposalDetailProps {
  proposalId: string;
}

type CornerStatus = "accepted" | "declined" | "pending";

const statusStyle = (s: CornerStatus): React.CSSProperties => {
  if (s === "accepted") return { background: "rgba(34,197,94,0.14)", color: "hsl(var(--success))" };
  if (s === "declined") return { background: "rgba(239,68,68,0.14)", color: "hsl(var(--primary))" };
  return { background: "rgba(232,160,32,0.14)", color: "hsl(var(--primary))" };
};

function StatusPill({ status, size = "sm" }: { status: CornerStatus; size?: "sm" | "md" }) {
  const label = status.toUpperCase();
  const fs = size === "md" ? 11 : 10;
  const pad = size === "md" ? "5px 12px" : "3px 10px";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: pad,
        fontSize: fs,
        fontWeight: 700,
        letterSpacing: "0.08em",
        ...statusStyle(status),
      }}
    >
      {label}
    </span>
  );
}

function Initials({ name, color }: { name: string; color: "red" | "blue" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
  const ring = color === "red" ? "rgba(239,68,68,0.55)" : "rgba(37,99,235,0.55)";
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: "hsl(var(--muted))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter",
        fontWeight: 700,
        fontSize: 13,
        color: "hsl(var(--foreground))",
        boxShadow: `inset 0 0 0 2px ${ring}`,
        flexShrink: 0,
      }}
    >
      {initials || "?"}
    </div>
  );
}

function userDecisionFor(
  uid: string | null | undefined,
  confirmations: ConfirmationRow[],
): { status: CornerStatus; at: string | null } {
  if (!uid) return { status: "pending", at: null };
  const c = confirmations.find((x) => x.user_id === uid);
  if (!c) return { status: "pending", at: null };
  return {
    status: c.decision === "accepted" ? "accepted" : "declined",
    at: c.decided_at,
  };
}

function sideOverall(
  side: ProposalSide,
  confirmations: ConfirmationRow[],
): CornerStatus {
  if (side.requiredUserIds.length === 0) return "accepted";
  const rel = confirmations.filter((c) => side.requiredUserIds.includes(c.user_id));
  if (rel.some((c) => c.decision === "declined")) return "declined";
  const accepted = new Set(rel.filter((c) => c.decision === "accepted").map((c) => c.user_id));
  return side.requiredUserIds.every((u) => accepted.has(u)) ? "accepted" : "pending";
}

function fmtWhen(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

interface PartyRowProps {
  name: string;
  subtitle: string;
  decision: { status: CornerStatus; at: string | null };
  canAct: boolean;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

function PartyRow({ name, subtitle, decision, canAct, busy, onAccept, onDecline }: PartyRowProps) {
  return (
    <div
      className="rounded-lg flex items-center justify-between gap-3"
      style={{
        background: "hsl(var(--muted) / 0.35)",
        padding: "12px 14px",
      }}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {subtitle}
          {decision.at ? ` · ${fmtWhen(decision.at)}` : ""}
        </p>
      </div>
      {canAct && decision.status !== "accepted" ? (
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            onClick={onAccept}
            disabled={busy}
            className="gap-1 h-8 px-3"
            style={{ background: "rgba(34,197,94,0.15)", color: "hsl(var(--success))" }}
          >
            <Check className="h-3.5 w-3.5" /> Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDecline}
            disabled={busy}
            className="gap-1 h-8 px-3"
            style={{ background: "rgba(239,68,68,0.15)", color: "hsl(var(--primary))" }}
          >
            <X className="h-3.5 w-3.5" /> Decline
          </Button>
        </div>
      ) : (
        <StatusPill status={decision.status} />
      )}
    </div>
  );
}

function CornerCard({
  color,
  parties,
  side,
  confirmations,
  userId,
  onDecide,
  busy,
}: {
  color: "red" | "blue";
  parties: ProposalParties;
  side: ProposalSide;
  confirmations: ConfirmationRow[];
  userId: string | undefined;
  onDecide: (targetUserId: string, role: "fighter" | "coach", decision: "accepted" | "declined") => void;
  busy: boolean;
}) {
  const label = color === "red" ? "Red corner" : "Blue corner";
  const cornerStatus = sideOverall(side, confirmations);
  const fighterDecision = userDecisionFor(side.fighterUserId, confirmations);
  const coachDecision = userDecisionFor(side.coachUserId, confirmations);

  const canFighterAct = !!userId && userId === side.fighterUserId;
  const canCoachAct = !!userId && !!side.coachUserId && userId === side.coachUserId;

  return (
    <div
      className="rounded-xl bg-card p-4 md:p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Corner header */}
      <div className="flex items-center gap-3 mb-4">
        <Initials name={side.fighterName} color={color} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground truncate">
            {side.coachName ?? "No coach linked"}
          </p>
        </div>
        <StatusPill status={cornerStatus} />
      </div>

      <div className="space-y-2">
        <PartyRow
          name={side.fighterName}
          subtitle={`Fighter — ${label}`}
          decision={fighterDecision}
          canAct={canFighterAct && cornerStatus !== "accepted"}
          busy={busy}
          onAccept={() => side.fighterUserId && onDecide(side.fighterUserId, "fighter", "accepted")}
          onDecline={() => side.fighterUserId && onDecide(side.fighterUserId, "fighter", "declined")}
        />
        {side.coachUserId && (
          <PartyRow
            name={side.coachName ?? "Coach"}
            subtitle={`Coach — ${label}`}
            decision={coachDecision}
            canAct={canCoachAct && cornerStatus !== "accepted"}
            busy={busy}
            onAccept={() => side.coachUserId && onDecide(side.coachUserId, "coach", "accepted")}
            onDecline={() => side.coachUserId && onDecide(side.coachUserId, "coach", "declined")}
          />
        )}
      </div>
    </div>
  );
}

export function ProposalDetail({ proposalId }: ProposalDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: parties, isLoading: loadingParties } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => getProposalParties(proposalId),
  });

  const { data: confirmations = [] } = useQuery({
    queryKey: ["proposal-confirmations", proposalId],
    queryFn: () => fetchConfirmations(proposalId),
  });

  useEffect(() => {
    const channel = supabase
      .channel(`proposal:${proposalId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "confirmations", filter: `match_proposal_id=eq.${proposalId}` },
        () => queryClient.invalidateQueries({ queryKey: ["proposal-confirmations", proposalId] }),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "match_proposals", filter: `id=eq.${proposalId}` },
        () => queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [proposalId, queryClient]);

  if (loadingParties) {
    return <div className="p-6 text-sm text-muted-foreground">Loading proposal…</div>;
  }
  if (!parties) {
    return <div className="p-6 text-sm text-muted-foreground">Proposal not found.</div>;
  }

  const evaluation = evaluateProposal(parties, confirmations);
  const overallStatus: CornerStatus =
    evaluation.status === "confirmed"
      ? "accepted"
      : evaluation.status === "declined"
      ? "declined"
      : "pending";
  const final = evaluation.status === "confirmed" || evaluation.status === "declined";

  const handleDecide = async (
    targetUserId: string,
    role: "fighter" | "coach",
    decision: "accepted" | "declined",
  ) => {
    if (!user || user.id !== targetUserId || final) return;
    setBusy(true);
    try {
      const fresh = await recordDecision({
        proposalId,
        userId: user.id,
        role,
        decision,
      });
      await applyOutcome(parties, fresh, user.id, decision);
      await queryClient.invalidateQueries({ queryKey: ["proposal-confirmations", proposalId] });
      await queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast({ title: decision === "accepted" ? "You accepted the bout" : "You declined the bout" });
    } finally {
      setBusy(false);
    }
  };

  const event = parties.event;
  const slot = parties.eventFightSlot ?? parties.fightSlot;
  const eventDate = event?.date
    ? new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "TBA";
  const boutType = slot?.bout_type ?? "Bout";
  const weightLabel = slot?.weight_class ? formatEnum(slot.weight_class) : "";
  const promoter = event?.promotion_name ?? "the organiser";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p
              className="text-xs font-semibold uppercase mb-2"
              style={{ color: "hsl(var(--primary))", letterSpacing: "0.14em" }}
            >
              Match Proposal {event?.title ? `· ${event.title}` : ""}
            </p>
            <h1
              className="font-heading text-foreground"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "clamp(2rem, 6vw, 3.75rem)",
                lineHeight: 1,
                letterSpacing: "0.01em",
              }}
            >
              {parties.sideA.fighterName.toUpperCase()}{" "}
              <span style={{ color: "hsl(var(--primary))" }}>VS</span>{" "}
              {parties.sideB.fighterName.toUpperCase()}
            </h1>
            <p className="text-sm text-muted-foreground mt-3">
              {boutType}
              {weightLabel ? ` — ${weightLabel}` : ""} · proposed by {promoter} · {eventDate}
            </p>
          </div>
          <StatusPill status={overallStatus} size="md" />
        </div>
      </div>

      {/* Corner cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CornerCard
          color="red"
          parties={parties}
          side={parties.sideA}
          confirmations={confirmations}
          userId={user?.id}
          onDecide={handleDecide}
          busy={busy}
        />
        <CornerCard
          color="blue"
          parties={parties}
          side={parties.sideB}
          confirmations={confirmations}
          userId={user?.id}
          onDecide={handleDecide}
          busy={busy}
        />
      </div>

      {/* Footer note */}
      <div
        className="rounded-xl bg-card px-5 py-4 text-sm text-muted-foreground"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        A bout confirms only when every required party on both sides accepts: each fighter and their coach.
      </div>
    </div>
  );
}
