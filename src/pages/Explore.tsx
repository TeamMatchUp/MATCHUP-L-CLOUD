import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BannerAd } from "@/components/BannerAd";
import iconImg from "@/assets/icon-gold.webp";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  MapPin, Calendar, ArrowRight, Filter, Search, Ticket, Swords, X,
  SlidersHorizontal, Users, ShieldCheck, Map as MapIcon, Building2,
} from "lucide-react";
import { usePostcodeSearch, haversineDistance } from "@/hooks/use-postcode-search";
import { STYLE_LABELS } from "@/lib/format";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Database } from "@/integrations/supabase/types";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import React from "react";

type CountryCode = Database["public"]["Enums"]["country_code"];
type WeightClass = Database["public"]["Enums"]["weight_class"];
type FightingStyle = Database["public"]["Enums"]["fighting_style"];
type TabType = "events" | "gyms" | "fighters";

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

export default function Explore() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabType) || "events";
  const [tab, setTab] = useState<TabType>(initialTab);
  const [mapOpen, setMapOpen] = useState(false);

  // Shared filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const pc = usePostcodeSearch();

  // Events filters
  const [ticketsOnly, setTicketsOnly] = useState(false);
  const [unmatchedOnly, setUnmatchedOnly] = useState(false);

  // Fighters filters
  const [weightFilter, setWeightFilter] = useState("all");
  const [styleFilter, setStyleFilter] = useState("all");

  // Map refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const handleTabChange = (t: string) => {
    setTab(t as TabType);
    setSearchParams({ tab: t });
    setSearchQuery("");
    setFiltersOpen(false);
    if (t === "fighters") setMapOpen(false);
  };

  // ── Queries ──
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["explore-events", countryFilter],
    queryFn: async () => {
      let q = supabase.from("events").select("*, fight_slots(*), tickets(*)").eq("status", "published").order("date", { ascending: true });
      if (countryFilter !== "all") q = q.eq("country", countryFilter as CountryCode);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: gyms, isLoading: gymsLoading } = useQuery({
    queryKey: ["explore-gyms", countryFilter],
    queryFn: async () => {
      let q = supabase.from("gyms").select("*, fighter_gym_links(fighter_id)").order("name");
      if (countryFilter !== "all") q = q.eq("country", countryFilter as CountryCode);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: fighters, isLoading: fightersLoading } = useQuery({
    queryKey: ["explore-fighters", countryFilter, weightFilter, styleFilter],
    queryFn: async () => {
      let q = supabase.from("fighter_profiles").select("*, fighter_gym_links(gym_id, is_primary, status, gyms(name))").order("name");
      if (countryFilter !== "all") q = q.eq("country", countryFilter as CountryCode);
      if (weightFilter !== "all") q = q.eq("weight_class", weightFilter as WeightClass);
      if (styleFilter !== "all") q = q.eq("style", styleFilter as FightingStyle);
      const { data } = await q;

      const userIds = (data ?? []).map((f) => f.user_id).filter(Boolean) as string[];
      let avatarMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, avatar_url").in("id", userIds);
        profiles?.forEach((p) => { if (p.avatar_url) avatarMap.set(p.id, p.avatar_url); });
      }

      const fighterIds = (data ?? []).map(f => f.id);
      const { data: fightsA } = await supabase.from("fights").select("*").in("fighter_a_id", fighterIds);
      const { data: fightsB } = await supabase.from("fights").select("*").in("fighter_b_id", fighterIds);
      const fightMap = new Map<string, any>();
      [...(fightsA || []), ...(fightsB || [])].forEach((f) => fightMap.set(f.id, f));
      const allFights = Array.from(fightMap.values());

      const recordMap = new Map<string, { wins: number; losses: number; draws: number }>();
      (data ?? []).forEach((fighter) => {
        let wins = 0, losses = 0, draws = 0;
        allFights.forEach((fight) => {
          const isA = fight.fighter_a_id === fighter.id;
          const isB = fight.fighter_b_id === fighter.id;
          if (!isA && !isB) return;
          if (fight.fighter_a_id === fight.fighter_b_id && !fight.opponent_name) return;
          const isSelfRef = fight.fighter_a_id === fight.fighter_b_id;
          if (fight.winner_id) {
            if (fight.winner_id === fighter.id) wins++; else losses++;
          } else if (fight.result === "draw") {
            draws++;
          } else if (fight.result === "win") {
            if (isSelfRef || isA) wins++; else losses++;
          } else if (fight.result === "loss") {
            if (isSelfRef || isA) losses++; else wins++;
          }
        });
        recordMap.set(fighter.id, { wins, losses, draws });
      });

      return (data ?? []).map((f) => ({
        ...f,
        _avatar: f.profile_image || (f.user_id ? avatarMap.get(f.user_id) : null) || null,
        _record: recordMap.get(f.id) || { wins: 0, losses: 0, draws: 0 },
      }));
    },
  });

  // ── Filtered data ──
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((event) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (![event.title, event.promotion_name, event.location, event.venue_name, event.city].some(v => v?.toLowerCase().includes(q))) return false;
      }
      if (pc.coords && event.latitude != null && event.longitude != null) {
        if (haversineDistance(pc.coords.latitude, pc.coords.longitude, event.latitude, event.longitude) > pc.radius) return false;
      }
      if (ticketsOnly && (!event.tickets || event.tickets.length === 0)) return false;
      if (unmatchedOnly) {
        const open = event.fight_slots?.filter((s: any) => s.status === "open").length ?? 0;
        if (open === 0) return false;
      }
      return true;
    });
  }, [events, searchQuery, pc.coords, pc.radius, ticketsOnly, unmatchedOnly]);

  const filteredGyms = useMemo(() => {
    if (!gyms) return [];
    return gyms.filter((gym) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (![gym.name, gym.location, gym.city, gym.address, gym.description].some(v => v?.toLowerCase().includes(q))) return false;
      }
      if (pc.coords && gym.lat != null && gym.lng != null) {
        if (haversineDistance(pc.coords.latitude, pc.coords.longitude, gym.lat, gym.lng) > pc.radius) return false;
      }
      return true;
    });
  }, [gyms, searchQuery, pc.coords, pc.radius]);

  const filteredFighters = useMemo(() => {
    if (!fighters) return [];
    return fighters.filter((fighter) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const primaryGym = fighter.fighter_gym_links?.find((l: any) => l.is_primary && l.status === "approved");
      const gymName = primaryGym?.gyms?.name ?? "Independent";
      const record = `${fighter._record.wins}-${fighter._record.losses}-${fighter._record.draws}`;
      const styleLabel = fighter.style ? STYLE_LABELS[fighter.style] || fighter.style : "";
      const weightLabel = WEIGHT_CLASS_LABELS[fighter.weight_class] || fighter.weight_class;
      return [fighter.name, gymName, record, styleLabel, weightLabel, fighter.country].some(v => v?.toLowerCase().includes(q));
    });
  }, [fighters, searchQuery]);

  // ── Map logic ──
  useEffect(() => {
    if (!mapOpen || !mapContainer.current || mapRef.current) return;
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
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      },
      center: [-2.5, 53.5],
      zoom: 5.5,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [mapOpen]);

  const updateMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const map = mapRef.current;
    if (!map) return;
    const bounds = new mapboxgl.LngLatBounds();
    let has = false;

    // Events - gold pins
    if (tab === "events" || tab === "gyms") {
      const evts = tab === "events" ? filteredEvents : (events ?? []).filter(e => e.latitude != null && e.longitude != null);
      if (tab === "events") {
        evts.forEach((event: any) => {
          if (event.latitude == null || event.longitude == null) return;
          const el = document.createElement("div");
          el.style.cssText = "width:28px;height:28px;border-radius:50%;background:hsl(46,93%,61%);border:3px solid hsl(46,93%,48%);box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10;position:relative;";
          el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(213,33%,6%)" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
          const popup = new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(`
            <div style="font-family:inherit;min-width:160px;">
              <p style="font-weight:700;margin:0 0 4px;">${event.title}</p>
              <p style="font-size:12px;color:#666;margin:0 0 6px;">${event.city || event.location || ''}</p>
              <span style="display:inline-block;font-size:10px;background:rgba(234,179,8,0.15);color:rgb(180,130,0);border:1px solid rgba(234,179,8,0.3);padding:1px 6px;border-radius:9999px;">Event</span>
              <div style="margin-top:8px;"><a href="/events/${event.id}" style="font-size:12px;color:hsl(46,93%,41%);text-decoration:none;">View Profile →</a></div>
            </div>
          `);
          const marker = new mapboxgl.Marker({ element: el }).setLngLat([event.longitude, event.latitude]).setPopup(popup).addTo(map);
          markersRef.current.push(marker);
          bounds.extend([event.longitude, event.latitude]);
          has = true;
        });
      }
    }

    // Gyms - white pins
    if (tab === "gyms") {
      filteredGyms.forEach((gym: any) => {
        if (gym.lat == null || gym.lng == null) return;
        const el = document.createElement("div");
        el.style.cssText = "width:28px;height:28px;border-radius:50%;background:#fff;border:3px solid #888;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10;position:relative;";
        el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
        const popup = new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(`
          <div style="font-family:inherit;min-width:160px;">
            <p style="font-weight:700;margin:0 0 4px;">${gym.name}</p>
            <p style="font-size:12px;color:#666;margin:0 0 6px;">${gym.city || gym.location || ''}</p>
            <span style="display:inline-block;font-size:10px;border:1px solid #888;padding:1px 6px;border-radius:9999px;">Gym</span>
            <div style="margin-top:8px;"><a href="/gyms/${gym.id}" style="font-size:12px;color:hsl(46,93%,41%);text-decoration:none;">View Profile →</a></div>
          </div>
        `);
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([gym.lng, gym.lat]).setPopup(popup).addTo(map);
        markersRef.current.push(marker);
        bounds.extend([gym.lng, gym.lat]);
        has = true;
      });
    }

    if (has) map.fitBounds(bounds, { padding: 60, maxZoom: 12 });
  }, [tab, filteredEvents, filteredGyms, events]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapOpen) return;
    if (map.loaded()) updateMarkers();
    else { map.on("load", updateMarkers); return () => { map.off("load", updateMarkers); }; }
  }, [updateMarkers, mapOpen]);

  // Destroy map on close
  useEffect(() => {
    if (!mapOpen && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, [mapOpen]);

  const isLoading = tab === "events" ? eventsLoading : tab === "gyms" ? gymsLoading : fightersLoading;

  const searchPlaceholder = tab === "events" ? "Search events, promotions, venues..." : tab === "gyms" ? "Search gyms by name, location..." : "Search fighters...";

  // ── Render ──
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="pt-16 flex-1 flex flex-col">
        <section className="py-8 flex-1 flex flex-col">
          <div className={`${mapOpen ? "px-0" : "container"} flex-1 flex flex-col`}>
            {/* Title + Tabs */}
            <div className={mapOpen ? "container" : ""}>
              <motion.h1
                className="font-heading text-4xl md:text-5xl text-foreground mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                EXPLORE
              </motion.h1>

              <Tabs value={tab} onValueChange={handleTabChange} className="mb-6">
                <TabsList className="bg-muted">
                  <TabsTrigger value="events" className="uppercase tracking-wide text-xs font-medium">
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />Events
                  </TabsTrigger>
                  <TabsTrigger value="gyms" className="uppercase tracking-wide text-xs font-medium">
                    <Building2 className="h-3.5 w-3.5 mr-1.5" />Gyms
                  </TabsTrigger>
                  <TabsTrigger value="fighters" className="uppercase tracking-wide text-xs font-medium">
                    <Users className="h-3.5 w-3.5 mr-1.5" />Fighters
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Search + Filters */}
              <div className="space-y-3 mb-6">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                  </div>
                  <Button variant={filtersOpen ? "default" : "outline"} size="icon" onClick={() => setFiltersOpen(!filtersOpen)} className="shrink-0 h-10 w-10">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </div>

                <AnimatePresence>
                  {filtersOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="rounded-lg border border-border bg-card p-3 sm:p-4 space-y-4">
                        <div className="flex flex-wrap gap-3 items-center">
                          <Select value={countryFilter} onValueChange={setCountryFilter}>
                            <SelectTrigger className="w-[140px] sm:w-[160px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Country" /></SelectTrigger>
                            <SelectContent position="popper" side="bottom">
                              <SelectItem value="all">All Countries</SelectItem>
                              <SelectItem value="UK">UK</SelectItem>
                              <SelectItem value="USA">USA</SelectItem>
                              <SelectItem value="AUS">Australia</SelectItem>
                            </SelectContent>
                          </Select>

                          {tab === "events" && (
                            <>
                              <div className="flex items-center gap-2">
                                <Switch id="tickets-filter" checked={ticketsOnly} onCheckedChange={setTicketsOnly} />
                                <Label htmlFor="tickets-filter" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer"><Ticket className="h-3.5 w-3.5" /> Tickets</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch id="unmatched-filter" checked={unmatchedOnly} onCheckedChange={setUnmatchedOnly} />
                                <Label htmlFor="unmatched-filter" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer"><Swords className="h-3.5 w-3.5" /> Open Slots</Label>
                              </div>
                            </>
                          )}

                          {tab === "fighters" && (
                            <>
                              <Select value={weightFilter} onValueChange={setWeightFilter}>
                                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Weight Class" /></SelectTrigger>
                                <SelectContent position="popper" side="bottom">
                                  <SelectItem value="all">All Weights</SelectItem>
                                  {Object.entries(WEIGHT_CLASS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Select value={styleFilter} onValueChange={setStyleFilter}>
                                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Style" /></SelectTrigger>
                                <SelectContent position="popper" side="bottom">
                                  <SelectItem value="all">All Styles</SelectItem>
                                  {Object.entries(STYLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </>
                          )}
                        </div>

                        {/* Location search - events and gyms only */}
                        {tab !== "fighters" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location Search</span>
                            </div>
                            <div className="flex gap-2">
                              <Input placeholder="Enter UK postcode..." value={pc.postcode} onChange={(e) => pc.setPostcode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && pc.lookup()} className="flex-1 text-sm" />
                              <Button size="sm" onClick={pc.lookup} disabled={pc.isGeocoding || !pc.postcode.trim()}>{pc.isGeocoding ? "..." : "Search"}</Button>
                              {pc.coords && <Button size="sm" variant="ghost" onClick={pc.clear}><X className="h-4 w-4" /></Button>}
                            </div>
                            {pc.error && <p className="text-xs text-destructive">{pc.error}</p>}
                            {pc.coords && (
                              <div className="space-y-2">
                                <span className="text-xs text-muted-foreground">Within <span className="text-foreground font-medium">{pc.radius} miles</span> of {pc.coords.postcode}</span>
                                <Slider value={[pc.radius]} onValueChange={([v]) => pc.setRadius(v)} min={1} max={100} step={1} className="w-full" />
                                <div className="flex justify-between text-[10px] text-muted-foreground"><span>1 mi</span><span>100 mi</span></div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Content area: directory + optional map */}
            <div className={`flex-1 flex ${mapOpen ? "overflow-hidden" : ""}`}>
              {/* Directory cards */}
              <div className={`${mapOpen ? "w-[420px] overflow-y-auto border-r border-border shrink-0 px-4 pb-4" : "container flex-1"}`}>
                {tab === "events" && <EventsDirectory events={filteredEvents} isLoading={eventsLoading} />}
                {tab === "gyms" && <GymsDirectory gyms={filteredGyms} isLoading={gymsLoading} />}
                {tab === "fighters" && <FightersDirectory fighters={filteredFighters ?? []} isLoading={fightersLoading} />}
              </div>

              {/* Map panel */}
              {mapOpen && tab !== "fighters" && (
                <div className="flex-1 min-h-[500px] relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-3 left-3 z-10"
                    onClick={() => setMapOpen(false)}
                  >
                    <X className="h-4 w-4 mr-1" /> Close Map
                  </Button>
                  <div ref={mapContainer} style={{ height: "100%", width: "100%", background: "#e8e0d8" }} />
                </div>
              )}
            </div>

            {/* Map preview card — shown when map is NOT open, and not on fighters tab */}
            {!mapOpen && tab !== "fighters" && (
              <div className="container mt-6">
                <button
                  onClick={() => setMapOpen(true)}
                  className="w-full rounded-lg border border-border bg-card p-4 flex items-center gap-4 hover:border-primary/30 transition-colors group"
                >
                  <div className="h-16 w-24 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <MapIcon className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-heading text-lg text-foreground">See Map</p>
                    <p className="text-xs text-muted-foreground">View {tab} on an interactive map</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
      {!mapOpen && <Footer />}
    </div>
  );
}

// ── Sub-components ──

function EventsDirectory({ events, isLoading }: { events: any[]; isLoading: boolean }) {
  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 rounded-lg bg-card animate-pulse" />)}</div>;
  if (events.length === 0) return <p className="text-muted-foreground text-center py-12">No events found matching your filters.</p>;
  return (
    <div className="space-y-4">
      {events.map((event, i) => {
        const openSlots = event.fight_slots?.filter((s: any) => s.status === "open").length ?? 0;
        const confirmedFights = event.fight_slots?.filter((s: any) => s.status === "confirmed").length ?? 0;
        const hasTickets = event.tickets && event.tickets.length > 0;
        return (
          <React.Fragment key={event.id}>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}>
              <Link to={`/events/${event.id}`} className="flex flex-col md:flex-row md:items-center justify-between rounded-lg border border-border bg-card p-5 hover:border-primary/30 transition-all block">
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading text-lg text-foreground truncate">{event.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{event.promotion_name}</p>
                  <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.city ? `${event.city}, ${event.location}` : event.location}</span>
                    {hasTickets && <span className="flex items-center gap-1 text-primary"><Ticket className="h-3.5 w-3.5" /> Tickets</span>}
                  </div>
                </div>
                <div className="flex items-center gap-6 mt-3 md:mt-0">
                  <div className="text-right">
                    <span className="block text-primary font-semibold text-sm">{openSlots} open</span>
                    <span className="block text-xs text-muted-foreground">{confirmedFights} confirmed</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            </motion.div>
            {(i + 1) % 5 === 0 && <BannerAd />}
          </React.Fragment>
        );
      })}
      {events.length < 5 && <BannerAd />}
      <motion.div className="flex justify-center py-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <Link to="/auth" className="inline-flex items-center gap-3 bg-muted hover:bg-muted/80 text-foreground font-medium text-sm px-8 py-3 rounded-full transition-colors">
          <img src={iconImg} alt="" className="h-5 w-5" />register your event
        </Link>
      </motion.div>
    </div>
  );
}

function GymsDirectory({ gyms, isLoading }: { gyms: any[]; isLoading: boolean }) {
  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{[1,2,3].map(i => <div key={i} className="h-40 rounded-lg bg-card animate-pulse" />)}</div>;
  if (gyms.length === 0) return <p className="text-muted-foreground text-center py-12">No gyms found matching your filters.</p>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {gyms.map((gym, i) => (
        <motion.div key={gym.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}>
          <Link to={`/gyms/${gym.id}`} className="rounded-lg border border-border bg-card p-6 hover:border-primary/30 transition-all block h-full relative">
            {gym.claimed && (
              <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold">
                <ShieldCheck className="h-3 w-3" /> Verified
              </span>
            )}
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center font-heading text-lg text-muted-foreground mb-4">
              {gym.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </div>
            <h3 className="font-heading text-xl text-foreground mb-1">{gym.name}</h3>
            {(gym.city || gym.location) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3"><MapPin className="h-3 w-3" />{gym.city ? `${gym.city}, ${gym.location || gym.country}` : gym.location}</p>
            )}
            {gym.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{gym.description}</p>}
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{gym.fighter_gym_links?.length ?? 0} fighters</div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

function FightersDirectory({ fighters, isLoading }: { fighters: any[]; isLoading: boolean }) {
  if (isLoading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{[1,2,3,4].map(i => <div key={i} className="h-48 rounded-lg bg-card animate-pulse" />)}</div>;
  if (fighters.length === 0) return <p className="text-muted-foreground text-center py-12">No fighters found.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {fighters.map((fighter, i) => {
        const primaryGym = fighter.fighter_gym_links?.find((l: any) => l.is_primary && l.status === "approved");
        const gymName = primaryGym?.gyms?.name ?? "Independent";
        const record = `${fighter._record.wins}-${fighter._record.losses}-${fighter._record.draws}`;
        return (
          <React.Fragment key={fighter.id}>
            {i > 0 && i % 5 === 0 && <BannerAd variant="grid-break" />}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.04 }}>
              <Link to={`/fighters/${fighter.id}`} className="rounded-lg border border-border bg-card p-6 hover:border-primary/30 transition-all block">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center font-heading text-lg text-muted-foreground overflow-hidden shrink-0">
                    {fighter._avatar ? <img src={fighter._avatar} alt={fighter.name} className="h-full w-full object-cover" /> : fighter.name.split(" ").filter((n: string) => !n.startsWith('"')).map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <h3 className="font-heading text-lg text-foreground">{fighter.name}</h3>
                </div>
                <p className="text-primary font-bold text-lg">{record}</p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p>{WEIGHT_CLASS_LABELS[fighter.weight_class]} · {fighter.style ? STYLE_LABELS[fighter.style] : "—"}</p>
                  <p>{gymName}</p>
                </div>
              </Link>
            </motion.div>
          </React.Fragment>
        );
      })}
      {fighters.length < 5 && <BannerAd variant="grid-break" />}
    </div>
  );
}
