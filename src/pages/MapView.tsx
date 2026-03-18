import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Calendar, Building2, List, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type EntityType = "both" | "gyms" | "events";
type Discipline = "all" | "boxing" | "muay_thai" | "mma" | "kickboxing" | "bjj";

export default function MapView() {
  const isMobile = useIsMobile();
  const [entityType, setEntityType] = useState<EntityType>("both");
  const [discipline, setDiscipline] = useState<Discipline>("all");
  const [showList, setShowList] = useState(!isMobile);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

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

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        },
        layers: [{ id: "osm-layer", type: "raster", source: "osm-tiles", minzoom: 0, maxzoom: 19 }],
      },
      center: [-2.5, 53.5],
      zoom: 5.5,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers
  const updateMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const map = mapRef.current;
    if (!map) return;

    const bounds = new mapboxgl.LngLatBounds();
    let hasMarkers = false;

    // Event markers (gold)
    filteredEvents.forEach((event: any) => {
      if (event.latitude == null || event.longitude == null) return;
      const el = document.createElement("div");
      el.style.cssText = "width:28px;height:28px;border-radius:50%;background:hsl(46,93%,61%);border:3px solid hsl(46,93%,48%);box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;";
      el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(213,33%,6%)" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

      const popup = new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(`
        <div style="font-family:inherit;min-width:160px;">
          <p style="font-weight:700;margin:0 0 4px;">${event.title}</p>
          <p style="font-size:12px;color:#666;margin:0 0 6px;">${event.city || event.location}</p>
          <span style="display:inline-block;font-size:10px;background:rgba(234,179,8,0.15);color:rgb(180,130,0);border:1px solid rgba(234,179,8,0.3);padding:1px 6px;border-radius:9999px;">Event</span>
          <div style="margin-top:8px;"><a href="/events/${event.id}" style="font-size:12px;color:hsl(46,93%,41%);text-decoration:none;">View Profile →</a></div>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([event.longitude, event.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([event.longitude, event.latitude]);
      hasMarkers = true;
    });

    // Gym markers (white)
    filteredGyms.forEach((gym: any) => {
      if (gym.lat == null || gym.lng == null) return;
      const el = document.createElement("div");
      el.style.cssText = "width:28px;height:28px;border-radius:50%;background:#fff;border:3px solid #888;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;";
      el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

      const popup = new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(`
        <div style="font-family:inherit;min-width:160px;">
          <p style="font-weight:700;margin:0 0 4px;">${gym.name}</p>
          <p style="font-size:12px;color:#666;margin:0 0 6px;">${gym.city || gym.location}</p>
          <span style="display:inline-block;font-size:10px;border:1px solid #888;padding:1px 6px;border-radius:9999px;">Gym</span>
          <div style="margin-top:8px;"><a href="/gyms/${gym.id}" style="font-size:12px;color:hsl(46,93%,41%);text-decoration:none;">View Profile →</a></div>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([gym.lng, gym.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([gym.lng, gym.lat]);
      hasMarkers = true;
    });

    if (hasMarkers) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 12 });
    }
  }, [filteredEvents, filteredGyms]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.loaded()) {
      updateMarkers();
    } else {
      map.on("load", updateMarkers);
      return () => { map.off("load", updateMarkers); };
    }
  }, [updateMarkers]);

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
            <Button variant="outline" size="sm" onClick={() => setShowList(!showList)} className="ml-auto">
              {showList ? <X className="h-4 w-4 mr-1" /> : <List className="h-4 w-4 mr-1" />}
              {showList ? "Hide List" : "Show List"}
            </Button>
          )}
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          {/* Card List */}
          {showList && (
            <div className={`${isMobile ? "absolute inset-0 z-20 bg-background overflow-y-auto" : "w-[380px] border-r border-border overflow-y-auto shrink-0"}`}>
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
                  <Link key={event.id} to={`/events/${event.id}`} className="block rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />{event.city || event.location}
                        </p>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/30 shrink-0 text-[10px]">
                        <Calendar className="h-2.5 w-2.5 mr-0.5" />Event
                      </Badge>
                    </div>
                  </Link>
                ))}
                {filteredGyms.map((gym: any) => (
                  <Link key={gym.id} to={`/gyms/${gym.id}`} className="block rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{gym.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />{gym.city || gym.location}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        <Building2 className="h-2.5 w-2.5 mr-0.5" />Gym
                      </Badge>
                    </div>
                  </Link>
                ))}
                {filteredGyms.length === 0 && filteredEvents.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-8">No results found for current filters.</p>
                )}
              </div>
            </div>
          )}

          {/* Map */}
          <div className="flex-1 min-h-0">
            <div ref={mapContainer} style={{ height: "100%", width: "100%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
