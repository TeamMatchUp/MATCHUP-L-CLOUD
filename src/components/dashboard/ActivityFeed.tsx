import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const TYPE_LABELS: Record<string, string> = {
  match_proposed: "Match Proposal",
  match_accepted: "Match Accepted",
  match_declined: "Match Declined",
  match_confirmed: "Match Confirmed",
  match_withdrawn: "Match Withdrawn",
  event_update: "Event Update",
  system: "System",
  gym_invite: "Gym Invite",
};

const TYPE_COLORS: Record<string, string> = {
  match_proposed: "bg-primary",
  match_accepted: "bg-success",
  match_declined: "bg-destructive",
  match_confirmed: "bg-success",
  match_withdrawn: "bg-muted-foreground",
  event_update: "bg-secondary",
  system: "bg-muted-foreground",
  gym_invite: "bg-primary",
};

interface ActivityFeedProps {
  notifications: any[];
}

export function ActivityFeed({ notifications }: ActivityFeedProps) {
  const recentItems = notifications.slice(0, 10);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-heading text-lg text-foreground mb-3">
        RECENT <span className="text-primary">ACTIVITY</span>
      </h3>

      {recentItems.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No recent activity
        </p>
      ) : (
        <ScrollArea className="h-[280px] pr-2">
          <div className="space-y-0">
            {recentItems.map((n, i) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 py-3 ${
                  i < recentItems.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div
                  className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                    TYPE_COLORS[n.type] || "bg-muted-foreground"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      {TYPE_LABELS[n.type] || n.type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
                {!n.read && (
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
