import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { formatEnum } from "@/lib/format";

interface ProposalCardProps {
  proposal: any;
  userId: string;
  userRole?: "coach" | "fighter";
  coachFighterIds?: string[];
  onActionComplete?: () => void;
}

export function ProposalCard({ proposal }: ProposalCardProps) {
  const navigate = useNavigate();
  const fighterA = proposal.fighter_a;
  const fighterB = proposal.fighter_b;
  const eventTitle = proposal.fight_slot?.events?.title || "Event";
  const slotNumber = proposal.fight_slot?.slot_number || "?";
  const weightClass = proposal.fight_slot?.weight_class || "";

  const { data: confirmations = [] } = useQuery({
    queryKey: ["proposal-confirmations", proposal.id],
    queryFn: async () => {
      const { data } = await supabase.from("confirmations").select("*").eq("match_proposal_id", proposal.id);
      return data ?? [];
    },
  });

  const acceptedCount = confirmations.filter((c: any) => c.decision === "accepted").length;
  const declinedCount = confirmations.filter((c: any) => c.decision === "declined").length;

  const card: React.CSSProperties = {
    background: "#111318",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.4)",
  };

  return (
    <div className="rounded-lg p-5" style={card}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs" style={{ color: "#8b909e" }}>{eventTitle} · Slot #{slotNumber}</p>
          <p className="text-xs" style={{ color: "#555b6b" }}>{formatEnum(weightClass)}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {proposal.status === "pending"
            ? `${acceptedCount} accepted${declinedCount ? ` · ${declinedCount} declined` : ""}`
            : formatEnum(proposal.status)}
        </Badge>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <p className="font-heading text-lg" style={{ color: "#e8eaf0" }}>{fighterA?.name || "TBD"}</p>
          <p className="text-xs" style={{ color: "#8b909e" }}>
            {fighterA?.record_wins}W-{fighterA?.record_losses}L-{fighterA?.record_draws}D
          </p>
        </div>
        <span className="font-heading text-lg" style={{ color: "#e8a020" }}>VS</span>
        <div className="flex-1 text-right">
          <p className="font-heading text-lg" style={{ color: "#e8eaf0" }}>{fighterB?.name || "TBD"}</p>
          <p className="text-xs" style={{ color: "#8b909e" }}>
            {fighterB?.record_wins}W-{fighterB?.record_losses}L-{fighterB?.record_draws}D
          </p>
        </div>
      </div>

      <Button
        size="sm"
        onClick={() => navigate(`/proposals/${proposal.id}`)}
        className="gap-1"
        style={{ background: "#e8a020", color: "#0d0f12" }}
      >
        View proposal <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  );
}
