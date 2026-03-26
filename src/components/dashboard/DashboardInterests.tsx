import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Users, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatEnum } from "@/lib/format";

interface DashboardInterestsProps {
  userId: string;
  rosterFighterIds: string[];
}

export function DashboardInterests({ userId, rosterFighterIds }: DashboardInterestsProps) {
  const navigate = useNavigate();

  // Coach's own event claims/interests
  const { data: myInterests = [] } = useQuery({
    queryKey: ["coach-interests-mine", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_claims")
        .select("id, event_id, status, created_at, event:events(id, title, date, city, discipline, venue_name)")
        .eq("user_id", userId);
      return (data ?? []).map((c: any) => {
        const evt = Array.isArray(c.event) ? c.event[0] : c.event;
        return { id: c.id, eventId: evt?.id, title: evt?.title ?? "Event", date: evt?.date, city: evt?.city, discipline: evt?.discipline, venueName: evt?.venue_name, status: c.status, created_at: c.created_at };
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
        .select("id, created_at, fighter_id, fighter:fighter_profiles!fighter_event_interests_fighter_id_fkey(id, name, weight_class, discipline), event:events!fighter_event_interests_event_id_fkey(id, title, date, city, discipline, venue_name, organiser_id)")
        .in("fighter_id", rosterFighterIds);
      return (data ?? []).map((i: any) => {
        const fighter = Array.isArray(i.fighter) ? i.fighter[0] : i.fighter;
        const evt = Array.isArray(i.event) ? i.event[0] : i.event;
        return {
          id: i.id,
          fighterId: i.fighter_id,
          fighterName: fighter?.name ?? "Fighter",
          fighterWeight: fighter?.weight_class,
          fighterDiscipline: fighter?.discipline,
          eventId: evt?.id,
          title: evt?.title ?? "Event",
          date: evt?.date,
          city: evt?.city,
          discipline: evt?.discipline,
          venueName: evt?.venue_name,
          organiserId: evt?.organiser_id,
          created_at: i.created_at,
        };
      });
    },
    enabled: rosterFighterIds.length > 0,
  });

  // Group roster interests by event
  const eventGroups = rosterInterests.reduce((acc, i) => {
    const key = i.eventId || i.id;
    if (!acc[key]) {
      acc[key] = { eventId: i.eventId, title: i.title, date: i.date, city: i.city, discipline: i.discipline, venueName: i.venueName, organiserId: i.organiserId, fighters: [] };
    }
    acc[key].fighters.push({ id: i.fighterId, name: i.fighterName, weight: i.fighterWeight, discipline: i.fighterDiscipline });
    return acc;
  }, {} as Record<string, any>);

  const eventGroupList = Object.values(eventGroups);

  return (
    <div>
      <Tabs defaultValue="roster" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="roster">Roster Interests ({rosterInterests.length})</TabsTrigger>
          <TabsTrigger value="mine">My Interests ({myInterests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="roster">
          {eventGroupList.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">No fighters on your roster have expressed interest in events yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {eventGroupList.map((group: any) => (
                <div
                  key={group.eventId}
                  className="rounded-lg border border-border bg-card p-4 space-y-3 cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => group.eventId && navigate(`/events/${group.eventId}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{group.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {group.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(group.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                        {(group.venueName || group.city) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[group.venueName, group.city].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                      {group.discipline && (
                        <Badge variant="outline" className="text-[10px] mt-1">{group.discipline}</Badge>
                      )}
                    </div>
                    <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0" onClick={(e) => { e.stopPropagation(); if (group.eventId) navigate(`/events/${group.eventId}`); }}>
                      <Eye className="h-3 w-3" /> View Event
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.fighters.map((f: any) => (
                      <span key={f.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                        {f.name}
                        {f.weight && <span className="text-primary/60">· {formatEnum(f.weight)}</span>}
                      </span>
                    ))}
                  </div>
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
                <div
                  key={i.id}
                  className="rounded-lg border border-border bg-card p-4 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => i.eventId && navigate(`/events/${i.eventId}`)}
                >
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{i.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.city ? `${i.city} · ` : ""}{i.date ? new Date(i.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
                      {i.status && <Badge variant="outline" className="ml-2 text-[10px]">{i.status}</Badge>}
                    </p>
                  </div>
                  {i.eventId && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0" onClick={(e) => { e.stopPropagation(); navigate(`/events/${i.eventId}`); }}>
                      <Eye className="h-3 w-3" /> View
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
