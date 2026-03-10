import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ProposalCard } from "@/components/coach/ProposalCard";
import { MatchProposalCard } from "@/components/fighter/MatchProposalCard";

interface DashboardProposalsProps {
  isCoachOrOwner: boolean;
  isFighter: boolean;
  pendingProposals: any[];
  confirmedProposals: any[];
  userId: string;
  fighterIds: string[];
  fighterProfileId?: string;
  onRefresh: () => void;
}

export function DashboardProposals({
  isCoachOrOwner,
  isFighter,
  pendingProposals,
  confirmedProposals,
  userId,
  fighterIds,
  fighterProfileId,
  onRefresh,
}: DashboardProposalsProps) {
  const [search, setSearch] = useState("");

  const q = search.toLowerCase().trim();

  const filterByName = (proposals: any[]) =>
    q
      ? proposals.filter(
          (p: any) =>
            p.fighter_a?.name?.toLowerCase().includes(q) ||
            p.fighter_b?.name?.toLowerCase().includes(q)
        )
      : proposals;

  const filteredPending = filterByName(pendingProposals);
  const filteredConfirmed = filterByName(confirmedProposals);

  return (
    <div>
      <h2 className="font-heading text-2xl text-foreground mb-4">
        MATCH <span className="text-primary">PROPOSALS</span>
      </h2>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search proposals by fighter name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Pending */}
      {filteredPending.length > 0 && (
        <>
          <h3 className="font-heading text-lg text-foreground mb-3">
            PENDING <span className="text-primary">REVIEW</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {filteredPending.map((p: any) =>
              isFighter && !isCoachOrOwner && fighterProfileId ? (
                <MatchProposalCard
                  key={p.id}
                  proposal={p}
                  fighterProfileId={fighterProfileId}
                  userId={userId}
                  onActionComplete={onRefresh}
                />
              ) : (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  userId={userId}
                  userRole="coach"
                  coachFighterIds={fighterIds}
                  onActionComplete={onRefresh}
                />
              )
            )}
          </div>
        </>
      )}

      {/* Confirmed */}
      {filteredConfirmed.length > 0 && (
        <>
          <h3 className="font-heading text-lg text-foreground mb-3">
            CONFIRMED <span className="text-primary">MATCHES</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredConfirmed.map((p: any) =>
              isFighter && !isCoachOrOwner && fighterProfileId ? (
                <MatchProposalCard
                  key={p.id}
                  proposal={p}
                  fighterProfileId={fighterProfileId}
                  userId={userId}
                  onActionComplete={onRefresh}
                />
              ) : (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  userId={userId}
                  userRole="coach"
                  coachFighterIds={fighterIds}
                  onActionComplete={onRefresh}
                />
              )
            )}
          </div>
        </>
      )}

      {filteredPending.length === 0 && filteredConfirmed.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          {q ? "No proposals match your search." : "No proposals at this time."}
        </p>
      )}
    </div>
  );
}
