import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, MapPin, Trash2, Search, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { haversineDistance } from "@/hooks/use-postcode-search";
import { STYLE_LABELS } from "@/lib/format";

interface Props {
  fighterProfileId: string;
  fighterPostcode?: string | null;
}

const UK_POSTCODE_API = "https://api.postcodes.io/postcodes/";

export function FighterInterestsPage({ fighterProfileId, fighterPostcode }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState("all");
  const [fighterCoords, setFighterCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coordsLoaded, setCoordsLoaded] = useState(false);

  // Geocode fighter postcode
  useQuery({
    queryKey: ["fighter-postcode-coords", fighterPostcode],
    queryFn: async () => {
      if (!fighterPostcode) return null;
      const resp = await fetch(`${UK_POSTCODE_API}${encodeURIComponent(fighterPostcode)}`);
      const json = await resp.json();
      if (json.status === 200 && json.result) {
        setFighterCoords({ lat: json.result.latitude, lng: json.result.longitude });
      }
      setCoordsLoaded(true);
      return null;
    },
    enabled: !!fighterPostcode && !coordsLoaded,
    staleTime: Infinity,
  });

  const { data: interests = [], isLoading } = useQuery({
    queryKey: ["fighter-event-interests-page", fighterProfileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fighter_event_interests")
        .select("id, event_id, created_at, events(id, title, date, location, city, promotion_name, status, discipline, venue_name, latitude, longitude)")
        .eq("fighter_id", fighterProfileId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleRemove = async () => {
    if (!removingId) return;
    const { error } = await supabase
      .from("fighter_event_interests")
      .delete()
      .eq("id", removingId);

    if (error) {
      toast.error("Failed to remove interest.");
    } else {
      toast.success("Interest removed.");
      queryClient.invalidateQueries({ queryKey: ["fighter-event-interests-page"] });
    }
    setRemovingId(null);
  };

  const disciplines = useMemo(() => {
    const set = new Set<string>();
    interests.forEach((i: any) => {
      const evt = Array.isArray(i.events) ? i.events[0] : i.events;
      if (evt?.discipline) set.add(evt.discipline);
    });
    return Array.from(set);
  }, [interests]);

  const filteredInterests = useMemo(() => {
    let items = interests.map((interest: any) => {
      const event = Array.isArray(interest.events) ? interest.events[0] : interest.events;
      let distance: number | null = null;
      if (fighterCoords && event?.latitude != null && event?.longitude != null) {
        distance = haversineDistance(fighterCoords.lat, fighterCoords.lng, event.latitude, event.longitude);
      }
      return { ...interest, event, distance };
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) => i.event?.title?.toLowerCase().includes(q) || i.event?.city?.toLowerCase().includes(q) || i.event?.venue_name?.toLowerCase().includes(q));
    }

    if (disciplineFilter !== "all") {
      items = items.filter((i) => i.event?.discipline === disciplineFilter);
    }

    // Sort by distance if available, otherwise by date
    if (fighterCoords) {
      items.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    } else {
      items.sort((a, b) => new Date(a.event?.date ?? 0).getTime() - new Date(b.event?.date ?? 0).getTime());
    }

    return items;
  }, [interests, searchQuery, disciplineFilter, fighterCoords]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-card animate-pulse rounded-lg border border-border" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {!fighterPostcode && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm text-foreground font-medium">Add your postcode to see events sorted by distance</p>
          <p className="text-xs text-muted-foreground mt-1">Go to My Profile and add your postcode to enable distance-based sorting.</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Discipline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Disciplines</SelectItem>
            {disciplines.map((d) => (
              <SelectItem key={d} value={d}>{STYLE_LABELS[d] || d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredInterests.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground mb-2">
            {interests.length === 0
              ? "You haven't expressed interest in any events yet."
              : "No events match your filters."}
          </p>
          <Button variant="ghost" asChild>
            <Link to="/explore?tab=events">Browse Events</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInterests.map((interest: any) => {
            const event = interest.event;
            if (!event) return null;
            return (
              <div
                key={interest.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer overflow-hidden"
                onClick={() => navigate(`/events/${event.id}`)}
              >
                <div className="flex-1 min-w-0" onClick={(e) => { e.stopPropagation(); navigate(`/events/${event.id}`); }}>
                  <h3 className="font-heading text-lg text-foreground truncate">{event.title}</h3>
                  {event.promotion_name && (
                    <p className="text-xs text-muted-foreground truncate">{event.promotion_name}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(event.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[event.venue_name, event.city].filter(Boolean).join(", ") || event.location}
                    </span>
                    {interest.distance !== null && (
                      <span className="text-primary font-medium">{interest.distance.toFixed(1)} mi</span>
                    )}
                    {event.discipline && (
                      <Badge variant="outline" className="text-[10px]">{STYLE_LABELS[event.discipline] || event.discipline}</Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0 ml-2"
                  onClick={(e) => { e.stopPropagation(); setRemovingId(interest.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!removingId} onOpenChange={(open) => !open && setRemovingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Interest</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your interest in this event?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
