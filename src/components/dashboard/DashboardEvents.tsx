import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Calendar, ArrowRight, ArrowLeft, Search } from "lucide-react";
import { InterestedEventsPanel } from "@/components/fighter/InterestedEventsPanel";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success/20 text-success border-success/30",
  completed: "bg-secondary/20 text-secondary border-secondary/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

interface DashboardEventsProps {
  isCoachOrOwner: boolean;
  isOrganiser: boolean;
  isFighter: boolean;
  events: any[];
  fighterProfileId?: string;
}

export function DashboardEvents({
  isCoachOrOwner,
  isOrganiser,
  isFighter,
  events,
  fighterProfileId,
}: DashboardEventsProps) {
  const [eventSearch, setEventSearch] = useState("");

  // Fighter view - interested events
  if (isFighter && !isCoachOrOwner && !isOrganiser && fighterProfileId) {
    return (
      <div>
        <InterestedEventsPanel fighterProfileId={fighterProfileId} />
      </div>
    );
  }

  // Organiser / Coach view - created events
  const q = eventSearch.toLowerCase().trim();
  const filtered = q
    ? events.filter(
        (e: any) =>
          e.title?.toLowerCase().includes(q) ||
          e.location?.toLowerCase().includes(q) ||
          e.promotion_name?.toLowerCase().includes(q)
      )
    : events;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link to="/explore?tab=events">
              <Search className="h-3 w-3 mr-1" /> Browse
            </Link>
          </Button>
          <Button size="sm" className="gap-1" asChild>
            <Link to="/organiser/create-event?from=my-events">
              <Plus className="h-3 w-3" /> Create Event
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search events by title or location..."
          value={eventSearch}
          onChange={(e) => setEventSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        events.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">You haven't created any events yet.</p>
            <Button asChild>
              <Link to="/organiser/create-event?from=my-events">Create Your First Event</Link>
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground">No events match your search.</p>
        )
      ) : (
        <div className="space-y-3">
          {filtered.map((event: any) => {
            const eventSlots = event.fight_slots ?? [];
            const openSlots = eventSlots.filter((s: any) => s.status === "open").length;
            return (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{event.title}</p>
                    <Badge variant="outline" className={STATUS_COLORS[event.status] || ""}>
                      {event.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.date} · {event.location} · {eventSlots.length} slots ({openSlots} open)
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
