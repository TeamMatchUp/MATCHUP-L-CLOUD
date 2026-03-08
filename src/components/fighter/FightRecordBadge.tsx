import { ShieldCheck, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FightRecordBadgeProps {
  verificationStatus: "coach_verified" | "event_verified";
  size?: "sm" | "md";
}

export function FightRecordBadge({ verificationStatus, size = "sm" }: FightRecordBadgeProps) {
  if (verificationStatus === "event_verified") {
    return (
      <Badge
        variant="outline"
        className={`gap-1 border-primary/30 text-primary ${size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs"}`}
      >
        <ShieldCheck className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
        Event Verified
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`gap-1 border-muted-foreground/30 text-muted-foreground ${size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs"}`}
    >
      <UserCheck className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      Coach Verified
    </Badge>
  );
}
