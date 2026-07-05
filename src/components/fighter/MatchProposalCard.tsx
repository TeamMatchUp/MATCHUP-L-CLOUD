import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { formatEnum } from "@/lib/format";

interface MatchProposalCardProps {
  proposal: any;
  fighterProfileId: string;
  userId: string;
  // onActionComplete kept for prop compatibility but not used; ProposalDetail handles refetch.
  onActionComplete?: () => void;
}

export function MatchProposalCard({ proposal, fighterProfileId }: MatchProposalCardProps) {
  const navigate = useNavigate();
  const fighterA = proposal.fighter_a;
  const fighterB = proposal.fighter_b;
  const eventTitle = proposal.fight_slot?.events?.title || "Event";
  const eventDate = proposal.fight_slot?.events?.date || "";
  const weightClass = proposal.fight_slot?.weight_class || "";
  const isA = proposal.fighter_a_id === fighterProfileId;
  const opponent = isA ? fighterB : fighterA;

  const { data: confirmations = [] } = useQuery({
    queryKey: ["proposal-confirmations", proposal.id],
    queryFn: async () => {
      const { data } = await supabase.from("confirmations").select("*").eq("match_proposal_id", proposal.id);
      return data ?? [];
    },
  });

  const acceptedCount = confirmations.filter((c: any) => c.decision === "accepted").length;

  const card: React.CSSProperties = {
    background: "hsl(var(--card))",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.4)",
  };

  return (
    <div className="rounded-lg p-5" style={card}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            {eventTitle} · {eventDate}
          </p>
          <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{formatEnum(weightClass)}</p>
        </div>
        <Badge
          variant="outline"
          className={
            proposal.status === "confirmed"
              ? "bg-success/20 text-success border-success/30"
              : ""
          }
        >
          {proposal.status === "pending" ? `${acceptedCount} accepted` : formatEnum(proposal.status)}
        </Badge>
      </div>

      <div className="mb-4">
        <p className="text-xs mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Your Opponent</p>
        <p className="font-heading text-xl" style={{ color: "hsl(var(--foreground))" }}>{opponent?.name || "TBD"}</p>
        <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          {opponent?.record_wins}W-{opponent?.record_losses}L-{opponent?.record_draws}D
          {opponent?.style && ` · ${formatEnum(opponent.style)}`}
        </p>
      </div>

      <Button
        size="sm"
        onClick={() => navigate(`/proposals/${proposal.id}`)}
        className="gap-1"
        style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
      >
        View proposal <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  );
}
