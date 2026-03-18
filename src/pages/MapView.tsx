import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Calendar, Building2, List, X } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatEnum } from "@/lib/format";
import { useIsMobile } from "@/hooks/use-mobile";

// Custom marker icons
const goldIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:hsl(46,93%,61%);border:3px solid hsl(46,93%,48%);box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(213,33%,6%)" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const whiteIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:hsl(210,33%,93%);border:3px solid hsl(212,12%,47%);box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(213,33%,6%)" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

type EntityType = "both" | "gyms" | "events";
type Discipline = "all" | "boxing" | "muay_thai" | "mma" | "kickboxing" | "bjj";

function FitBounds({ markers }: { markers: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [markers, map]);
  return null;
}

export default function MapView() {
  const isMobile = useIsMobile();
  const [entityType, setEntityType] = useState<EntityType>("both");
  const [discipline, setDiscipline] = useState<Discipline>("all");
  const [showList, setShowList] = useState(!isMobile);

  const { data: gyms = [] } = useQuery({
    queryKey: ["map-gyms"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gyms")
        .select("id, name, city, country, lat, lng, discipline_tags, location")
        .not("lat", "is", null)
        .not("lng", "is", null);
      return data ?? [];
    },
    enabled: entityType !== "events",
  });

  const { data: events = [] } = useQuery({
    queryKey: ["map-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, city, country, latitude, longitude, discipline, date, status, location")
        .eq("status", "published")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      return data ?? [];
    },
    enabled: entityType !== "gyms",
  });

  const filteredGyms = useMemo(() => {
    if (entityType === "events") return [];
    return gyms.filter((g: any) => {
      if (discipline === "all") return true;
      return g.discipline_tags?.toLowerCase().includes(discipline);
    });
  }, [gyms, entityType, discipline]);

  const filteredEvents = useMemo(() => {
    if (entityType === "gyms") return [];
    return events.filter((e: any) => {
      if (discipline === "all") return true;
      return e.discipline?.toLowerCase() === discipline;
    });
  }, [events, entityType, discipline]);

  const allMarkers = useMemo(() => {
    const markers: [number, number][] = [];
    filteredGyms.forEach((g: any) => markers.push([g.lat, g.lng]));
    filteredEvents.forEach((e: any) => markers.push([e.latitude, e.longitude]));
    return markers;
  }, [filteredGyms, filteredEvents]);

  const defaultCenter: [number, number] = [53.5, -2.5]; // UK center

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16 h-screen flex flex-col">
        {/* Filters */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm shrink-0 flex-wrap">
          <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="gyms">Gyms</SelectItem>
              <SelectItem value="events">Events</SelectItem>
            </SelectContent>
          </Select>
          <Select value={discipline} onValueChange={(v) => setDiscipline(v as Discipline)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Disciplines</SelectItem>
              <SelectItem value="boxing">Boxing</SelectItem>
              <SelectItem value="muay_thai">Muay Thai</SelectItem>
              <SelectItem value="mma">MMA</SelectItem>
              <SelectItem value="kickboxing">Kickboxing</SelectItem>
              <SelectItem value="bjj">BJJ</SelectItem>
            </SelectContent>
          </Select>
          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowList(!showList)}
              className="ml-auto"
            >
              {showList ? <X className="h-4 w-4 mr-1" /> : <List className="h-4 w-4 mr-1" />}
              {showList ? "Hide List" : "Show List"}
            </Button>
          )}
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          {/* Card List */}
          {showList && (
            <div
              className={`${
                isMobile
                  ? "absolute inset-0 z-20 bg-background overflow-y-auto"
                  : "w-[380px] border-r border-border overflow-y-auto shrink-0"
              }`}
            >
              {isMobile && (
                <div className="sticky top-0 bg-background border-b border-border p-3 flex justify-between items-center z-10">
                  <span className="font-heading text-lg">Results ({filteredGyms.length + filteredEvents.length})</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowList(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="p-3 space-y-2">
                {filteredEvents.map((event: any) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="block rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {event.city || event.location}
                        </p>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/30 shrink-0 text-[10px]">
                        <Calendar className="h-2.5 w-2.5 mr-0.5" />Event
                      </Badge>
                    </div>
                  </Link>
                ))}
                {filteredGyms.map((gym: any) => (
                  <Link
                    key={gym.id}
                    to={`/gyms/${gym.id}`}
                    className="block rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{gym.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {gym.city || gym.location}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        <Building2 className="h-2.5 w-2.5 mr-0.5" />Gym
                      </Badge>
                    </div>
                  </Link>
                ))}
                {filteredGyms.length === 0 && filteredEvents.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    No results found for current filters.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Map */}
          <div className="flex-1">
            <MapContainer
              center={defaultCenter}
              zoom={6}
              style={{ height: "100%", width: "100%" }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {allMarkers.length > 0 && <FitBounds markers={allMarkers} />}
              {filteredEvents.map((event: any) => (
                <Marker
                  key={`e-${event.id}`}
                  position={[event.latitude, event.longitude]}
                  icon={goldIcon}
                >
                  <Popup>
                    <div className="text-sm min-w-[160px]">
                      <p className="font-bold">{event.title}</p>
                      <p className="text-xs text-gray-500">{event.city || event.location}</p>
                      <Badge className="mt-1 text-[10px] bg-amber-100 text-amber-800 border-amber-300">Event</Badge>
                      <div className="mt-2">
                        <Link to={`/events/${event.id}`} className="text-xs text-blue-600 hover:underline">
                          View Profile →
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
              {filteredGyms.map((gym: any) => (
                <Marker
                  key={`g-${gym.id}`}
                  position={[gym.lat, gym.lng]}
                  icon={whiteIcon}
                >
                  <Popup>
                    <div className="text-sm min-w-[160px]">
                      <p className="font-bold">{gym.name}</p>
                      <p className="text-xs text-gray-500">{gym.city || gym.location}</p>
                      <Badge className="mt-1 text-[10px]" variant="outline">Gym</Badge>
                      <div className="mt-2">
                        <Link to={`/gyms/${gym.id}`} className="text-xs text-blue-600 hover:underline">
                          View Profile →
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
