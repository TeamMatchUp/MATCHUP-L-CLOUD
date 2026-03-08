import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FightRecordBadge } from "./FightRecordBadge";
import { ShieldCheck, UserCheck } from "lucide-react";

interface FightHistoryProps {
  fighterId: string;
}

export function FightHistory({ fighterId }: FightHistoryProps) {
  const { data: fights = [] } = useQuery({
    queryKey: ["fighter-fights", fighterId],
    queryFn: async () => {
      const { data: fightsA } = await supabase
        .from("fights")
        .select("*")
        .eq("fighter_a_id", fighterId)
        .order("created_at", { ascending: false });

      const { data: fightsB } = await supabase
        .from("fights")
        .select("*")
        .eq("fighter_b_id", fighterId)
        .order("created_at", { ascending: false });

      const map = new Map<string, any>();
      [...(fightsA || []), ...(fightsB || [])].forEach((f) => map.set(f.id, f));
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });

  // Calculate dynamic record
  let wins = 0, losses = 0, draws = 0;
  let eventVerified = 0, coachVerified = 0;

  fights.forEach((f) => {
    const isA = f.fighter_a_id === fighterId;
    const result = f.result as string;

    if (result === "draw") {
      draws++;
    } else if (result === "win") {
      // If this fight was recorded for fighter_a and result is "win", fighter_a won
      if (isA) wins++;
      else losses++;
    } else if (result === "loss") {
      if (isA) losses++;
      else wins++;
    } else if (f.winner_id) {
      if (f.winner_id === fighterId) wins++;
      else losses++;
    }

    if (f.verification_status === "event_verified") eventVerified++;
    else coachVerified++;
  });

  const record = `${wins}-${losses}-${draws}`;

  return (
    <div>
      {/* Dynamic Record Summary */}
      <div className="mb-4">
        <p className="text-primary font-bold text-2xl">{record}</p>
        <div className="flex gap-3 mt-2">
          {eventVerified > 0 && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> {eventVerified} Event Verified
            </span>
          )}
          {coachVerified > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <UserCheck className="h-3.5 w-3.5" /> {coachVerified} Coach Verified
            </span>
          )}
        </div>
      </div>

      {/* Fight History List */}
      {fights.length > 0 && (
        <div>
          <h3 className="font-heading text-lg text-foreground mb-3">FIGHT HISTORY</h3>
          <div className="space-y-2">
            {fights.map((fight) => {
              const isA = fight.fighter_a_id === fighterId;
              const opponentName = fight.opponent_name || (isA ? "Opponent B" : "Opponent A");
              const resultText = fight.result === "draw" ? "Draw" : fight.result === "win" ? (isA ? "Win" : "Loss") : (isA ? "Loss" : "Win");
              const resultColor = resultText === "Win" ? "text-success" : resultText === "Loss" ? "text-destructive" : "text-muted-foreground";

              return (
                <div key={fight.id} className="rounded-lg border border-border bg-card p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-heading text-sm ${resultColor}`}>{resultText}</span>
                      <span className="text-sm text-foreground">vs {opponentName}</span>
                      <FightRecordBadge verificationStatus={fight.verification_status} />
                    </div>
                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                      {fight.method && <span>{fight.method}</span>}
                      {fight.round && <span>R{fight.round}</span>}
                      {fight.event_name && <span>· {fight.event_name}</span>}
                      {fight.event_date && <span>· {fight.event_date}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
