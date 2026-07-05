import type { SideStatus } from "@/lib/matchProposal";

interface PartyPillProps {
  label: string;
  status: SideStatus | "none";
}

function PartyPill({ label, status }: PartyPillProps) {
  if (status === "none") {
    return (
      <div
        className="rounded-full px-3 py-1.5 text-[11px]"
        style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", fontFamily: "Inter" }}
      >
        {label}: not assigned
      </div>
    );
  }
  const styles: Record<SideStatus, { bg: string; fg: string; text: string }> = {
    accepted: { bg: "rgba(239,68,68,0.18)", fg: "#ef4444", text: "Accepted" },
    declined: { bg: "rgba(239,68,68,0.16)", fg: "#ef4444", text: "Declined" },
    awaiting: { bg: "hsl(var(--muted))", fg: "hsl(var(--muted-foreground))", text: "Awaiting" },
  };
  const s = styles[status];
  return (
    <div
      className="rounded-full px-3 py-1.5 text-[11px] font-medium"
      style={{ background: s.bg, color: s.fg, fontFamily: "Inter" }}
    >
      {label}: {s.text}
    </div>
  );
}

interface Props {
  breakdown: {
    fighterA: SideStatus;
    coachA: SideStatus | "none";
    fighterB: SideStatus;
    coachB: SideStatus | "none";
  };
  fighterAName: string;
  fighterBName: string;
  coachAName?: string | null;
  coachBName?: string | null;
}

export function ProposalProgress({
  breakdown,
  fighterAName,
  fighterBName,
  coachAName,
  coachBName,
}: Props) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: "hsl(var(--card))",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.4)",
      }}
    >
      <p
        className="mb-3 text-[11px] uppercase tracking-[0.08em]"
        style={{ color: "hsl(var(--muted-foreground))", fontFamily: "Inter" }}
      >
        Acceptance Progress
      </p>
      <div className="flex flex-wrap gap-2">
        <PartyPill label={fighterAName || "Fighter A"} status={breakdown.fighterA} />
        <PartyPill label={coachAName ? `Coach (${coachAName})` : "Coach A"} status={breakdown.coachA} />
        <PartyPill label={fighterBName || "Fighter B"} status={breakdown.fighterB} />
        <PartyPill label={coachBName ? `Coach (${coachBName})` : "Coach B"} status={breakdown.coachB} />
      </div>
    </div>
  );
}
