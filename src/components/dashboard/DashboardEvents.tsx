import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, ArrowRight, Search } from "lucide-react";
import { InterestedEventsPanel } from "@/components/fighter/InterestedEventsPanel";
import { useAuth } from "@/contexts/AuthContext";

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

function startOfTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DashboardEvents({
  isCoachOrOwner,
  isOrganiser,
  isFighter,
  events,
  fighterProfileId,
}: DashboardEventsProps) {
  const [eventSearch, setEventSearch] = useState("");
  const [tab, setTab] = useState<"upcoming" | "archive">("upcoming");
  const { user } = useAuth();
  const currentUserId = user?.id;

  // Fighter view - interested events
  if (isFighter && !isCoachOrOwner && !isOrganiser && fighterProfileId) {
    return (
      <div>
        <InterestedEventsPanel fighterProfileId={fighterProfileId} />
      </div>
    );
  }

  const { upcoming, archive } = useMemo(() => {
    const today = startOfTodayISO();
    const up: any[] = [];
    const ar: any[] = [];
    for (const e of events) {
      if (!e?.date) { up.push(e); continue; }
      const d = String(e.date).slice(0, 10);
      if (d >= today) up.push(e); else ar.push(e);
    }
    return { upcoming: up, archive: ar };
  }, [events]);

  const q = eventSearch.toLowerCase().trim();
  const applySearch = (list: any[]) =>
    q
      ? list.filter(
          (e: any) =>
            e.title?.toLowerCase().includes(q) ||
            e.location?.toLowerCase().includes(q) ||
            e.promotion_name?.toLowerCase().includes(q)
        )
      : list;

  const renderList = (list: any[], emptyNode: React.ReactNode) => {
    if (list.length === 0) return emptyNode;
    return (
      <div className="space-y-3">
        {list.map((event: any) => {
          const eventSlots = event.fight_slots ?? [];
          const openSlots = eventSlots.filter((s: any) => s.status === "open").length;
          return (
            <Link
              key={event.id}
              to={event.organiser_id === currentUserId ? `/organiser/events/${event.id}` : `/events/${event.id}`}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground">{event.title}</p>
                  <Badge variant="outline" className={STATUS_COLORS[event.status] || ""}>
                    {event.status}
                  </Badge>
                  {event.review_status === "pending" && (
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-500 border-amber-500/30">
                      Pending Review
                    </Badge>
                  )}
                  {event.review_status === "rejected" && (
                    <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30">
                      Rejected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {event.date} · {event.location} · {eventSlots.length} slots ({openSlots} open)
                </p>
                {event.review_status === "rejected" && event.review_reason && (
                  <p className="text-xs text-destructive mt-1">Reason: {event.review_reason}</p>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    );
  };

  const emptyAll = (
    <div className="rounded-lg border border-border bg-card p-8 text-center">
      <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground mb-4">You haven't created any events yet.</p>
      <Button asChild>
        <Link to="/organiser/create-event?from=my-events">Create Your First Event</Link>
      </Button>
    </div>
  );

  const filteredUpcoming = applySearch(upcoming);
  const filteredArchive = applySearch(archive);

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

      <Tabs value={tab} onValueChange={(v) => setTab(v as "upcoming" | "archive")} className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming & Live Events
            <span className="ml-2 text-xs text-muted-foreground">({upcoming.length})</span>
          </TabsTrigger>
          <TabsTrigger value="archive">
            Event Archive
            <span className="ml-2 text-xs text-muted-foreground">({archive.length})</span>
          </TabsTrigger>
        </TabsList>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events by title or location..."
            value={eventSearch}
            onChange={(e) => setEventSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <TabsContent value="upcoming">
          {renderList(
            filteredUpcoming,
            events.length === 0
              ? emptyAll
              : q
              ? <p className="text-muted-foreground">No upcoming events match your search.</p>
              : archive.length > 0
              ? <p className="text-muted-foreground">No upcoming events. Check your archive or create a new one.</p>
              : <p className="text-muted-foreground">No upcoming events.</p>
          )}
        </TabsContent>

        <TabsContent value="archive">
          {renderList(
            filteredArchive,
            q
              ? <p className="text-muted-foreground">No archived events match your search.</p>
              : <p className="text-muted-foreground">No archived events yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
