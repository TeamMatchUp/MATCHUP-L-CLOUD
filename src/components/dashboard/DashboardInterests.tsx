import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Calendar, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardInterestsProps {
  userId: string;
  rosterFighterIds: string[];
}

export function DashboardInterests({ userId, rosterFighterIds }: DashboardInterestsProps) {
  // Coach's own event claims/interests
  const { data: myInterests = [] } = useQuery({
    queryKey: ["coach-interests-mine", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_claims")
        .select("id, event_id, status, created_at, event:events(id, title, date, city)")
        .eq("user_id", userId);
      return (data ?? []).map((c: any) => {
        const evt = Array.isArray(c.event) ? c.event[0] : c.event;
        return { id: c.id, eventId: evt?.id, title: evt?.title ?? "Event", date: evt?.date, city: evt?.city, status: c.status, created_at: c.created_at };
      });
    },
    enabled: !!userId,
  });

  // Roster fighter event interests
  const { data: rosterInterests = [] } = useQuery({
    queryKey: ["coach-interests-roster", rosterFighterIds],
    queryFn: async () => {
      if (rosterFighterIds.length === 0) return [];
      const { data } = await supabase
        .from("fighter_event_interests")
        .select("id, created_at, fighter_id, fighter:fighter_profiles!fighter_event_interests_fighter_id_fkey(name), event:events!fighter_event_interests_event_id_fkey(id, title, date, city)")
        .in("fighter_id", rosterFighterIds);
      return (data ?? []).map((i: any) => {
        const fighter = Array.isArray(i.fighter) ? i.fighter[0] : i.fighter;
        const evt = Array.isArray(i.event) ? i.event[0] : i.event;
        return { id: i.id, fighterName: fighter?.name ?? "Fighter", eventId: evt?.id, title: evt?.title ?? "Event", date: evt?.date, city: evt?.city, created_at: i.created_at };
      });
    },
    enabled: rosterFighterIds.length > 0,
  });

  return (
    <div>
      <h2 className="font-heading text-2xl text-foreground mb-4">
        INTERESTS
      </h2>
      <Tabs defaultValue="roster" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="roster">Roster Interests ({rosterInterests.length})</TabsTrigger>
          <TabsTrigger value="mine">My Interests ({myInterests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="roster">
          {rosterInterests.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">No fighters on your roster have expressed interest in events yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rosterInterests.map((i) => (
                <div key={i.id} className="rounded-lg border border-border bg-card p-4 flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{i.fighterName} is interested in {i.title}</p>
                    <p className="text-xs text-muted-foreground">{i.city ? `${i.city} · ` : ""}{i.date ? new Date(i.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}</p>
                  </div>
                  {i.eventId && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0" asChild>
                      <Link to={`/events/${i.eventId}`}><Eye className="h-3 w-3" /> View</Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine">
          {myInterests.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">You haven't expressed interest in any events yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myInterests.map((i) => (
                <div key={i.id} className="rounded-lg border border-border bg-card p-4 flex items-center gap-4">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{i.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.city ? `${i.city} · ` : ""}{i.date ? new Date(i.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
                      {i.status && <Badge variant="outline" className="ml-2 text-[10px]">{i.status}</Badge>}
                    </p>
                  </div>
                  {i.eventId && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0" asChild>
                      <Link to={`/events/${i.eventId}`}><Eye className="h-3 w-3" /> View</Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
