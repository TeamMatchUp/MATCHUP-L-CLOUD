import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Calendar, Eye, Users, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface DashboardInterestsProps {
  userId: string;
  rosterFighterIds: string[];
}

export function DashboardInterests({ userId, rosterFighterIds }: DashboardInterestsProps) {
  const queryClient = useQueryClient();
  const [putForwardEvent, setPutForwardEvent] = useState<any>(null);
  const [selectedFighters, setSelectedFighters] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

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

  const handlePutForward = (eventGroup: any) => {
    setPutForwardEvent(eventGroup);
    setSelectedFighters([]);
  };

  const handleSubmitPutForward = async () => {
    if (!putForwardEvent || selectedFighters.length === 0) return;
    setSubmitting(true);
    try {
      for (const fighterId of selectedFighters) {
        // Create a coach_event_nomination
        await supabase.from("coach_event_nominations").insert({
          coach_id: userId,
          fighter_id: fighterId,
          event_id: putForwardEvent.eventId,
        });

        // Notify the organiser
        if (putForwardEvent.organiserId) {
          const fighter = putForwardEvent.fighters.find((f: any) => f.id === fighterId);
          await supabase.rpc("create_notification", {
            _user_id: putForwardEvent.organiserId,
            _title: "Fighter Nominated",
            _message: `${fighter?.name ?? "A fighter"} has been put forward for ${putForwardEvent.title} by their coach.`,
            _type: "event_update" as any,
            _reference_id: putForwardEvent.eventId,
          });
        }
      }
      toast.success(`${selectedFighters.length} fighter${selectedFighters.length > 1 ? "s" : ""} put forward`);
      setPutForwardEvent(null);
      queryClient.invalidateQueries({ queryKey: ["coach-interests-roster"] });
    } catch {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

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
          {eventGroupList.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">No fighters on your roster have expressed interest in events yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {eventGroupList.map((group: any) => (
                <div key={group.eventId} className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{group.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {[group.venueName, group.city].filter(Boolean).join(", ")}
                        {group.date ? ` · ${new Date(group.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                      </p>
                      {group.discipline && (
                        <Badge variant="outline" className="text-[10px] mt-1">{group.discipline}</Badge>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handlePutForward(group)}>
                        <Users className="h-3 w-3" /> Put Forward Fighter
                      </Button>
                      {group.eventId && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs" asChild>
                          <Link to={`/events/${group.eventId}`}><Eye className="h-3 w-3" /> View</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.fighters.map((f: any) => (
                      <span key={f.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                        {f.name}
                        {f.weight && <span className="text-primary/60">· {f.weight}</span>}
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

      {/* Put Forward Fighter Modal */}
      <Dialog open={!!putForwardEvent} onOpenChange={(open) => { if (!open) setPutForwardEvent(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Put Forward Fighter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select fighters to nominate for <span className="text-foreground font-medium">{putForwardEvent?.title}</span>
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {putForwardEvent?.fighters.map((f: any) => (
                <label key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/20 transition-colors cursor-pointer">
                  <Checkbox
                    checked={selectedFighters.includes(f.id)}
                    onCheckedChange={(checked) => {
                      setSelectedFighters((prev) =>
                        checked ? [...prev, f.id] : prev.filter((id) => id !== f.id)
                      );
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[f.weight, f.discipline].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPutForwardEvent(null)}>Cancel</Button>
            <Button onClick={handleSubmitPutForward} disabled={selectedFighters.length === 0 || submitting}>
              <Check className="h-4 w-4 mr-1" />
              {submitting ? "Submitting..." : `Nominate ${selectedFighters.length} fighter${selectedFighters.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
