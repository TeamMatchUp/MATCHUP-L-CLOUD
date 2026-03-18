import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

interface GymTierBadgeProps {
  tier: string | null;
}

export function GymTierBadge({ tier }: GymTierBadgeProps) {
  switch (tier) {
    case "featured":
      return (
        <Badge className="bg-primary/15 text-primary border-primary/30 gap-1">
          <Star className="h-3 w-3 fill-primary" /> Featured
        </Badge>
      );
    case "pro":
      return (
        <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30">
          Pro
        </Badge>
      );
    case "free":
      return (
        <Badge variant="outline" className="border-foreground/30 text-foreground/70">
          Free
        </Badge>
      );
    case "unclaimed":
    default:
      return (
        <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
          Unclaimed
        </Badge>
      );
  }
}
