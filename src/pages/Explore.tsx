import { useState, useMemo } from "react";
import { useSearchParams, Link, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BannerAd } from "@/components/BannerAd";
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
  MapPin, Calendar, ArrowRight, ArrowLeft, Filter, Search, Ticket, Swords, X,
  SlidersHorizontal, Users, ShieldCheck, Building2,
} from "lucide-react";
import { usePostcodeSearch, haversineDistance } from "@/hooks/use-postcode-search";
import { STYLE_LABELS } from "@/lib/format";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Database } from "@/integrations/supabase/types";
import { Map as PigeonMap, Marker, Overlay } from "pigeon-maps";
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

const ITEMS_PER_PAGE = 16;

export default function Explore() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const getInitialTab = (): TabType => {
    if (location.pathname === "/events") return "events";
    if (location.pathname === "/fighters") return "fighters";
    if (location.pathname === "/gyms") return "gyms";
    return (searchParams.get("tab") as TabType) || "events";
  };

  const [tab, setTab] = useState<TabType>(getInitialTab);
  const [mapOpen, setMapOpen] = useState(false);
  const [highlightedGymId, setHighlightedGymId] = useState<string | null>(null);
  const [popupItem, setPopupItem] = useState<any>(null);
  const [page, setPage] = useState(0);

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

  const handleTabChange = (t: string) => {
    setTab(t as TabType);
    setSearchParams({ tab: t });
    setSearchQuery("");
    setFiltersOpen(false);
    setPopupItem(null);
    setPage(0);
    if (t === "fighters") setMapOpen(false);
  };

  // ── Queries ──
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["explore-events", countryFilter],
    queryFn: async () => {
      let q = supabase.from("events").select("*, fight_slots(*), tickets(*), event_fight_slots(id, status, fighter_a_id, fighter_b_id)").eq("status", "published").order("date", { ascending: true });
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

  // Pagination
  const currentItems = tab === "events" ? filteredEvents : tab === "gyms" ? filteredGyms : filteredFighters;
  const totalPages = Math.ceil(currentItems.length / ITEMS_PER_PAGE);
  const paginatedItems = currentItems.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  // Map markers data
  const mapMarkers = useMemo(() => {
    const markers: { lat: number; lng: number; type: "event" | "gym"; name: string; city: string; id: string }[] = [];
    if (tab === "events") {
      filteredEvents.forEach((e: any) => {
        if (e.latitude != null && e.longitude != null) markers.push({ lat: e.latitude, lng: e.longitude, type: "event", name: e.title, city: e.city || e.location || "", id: e.id });
      });
    }
    if (tab === "gyms") {
      filteredGyms.forEach((g: any) => {
        if (g.lat != null && g.lng != null) markers.push({ lat: g.lat, lng: g.lng, type: "gym", name: g.name, city: g.city || g.location || "", id: g.id });
      });
    }
    return markers;
  }, [tab, filteredEvents, filteredGyms]);

  const isLoading = tab === "events" ? eventsLoading : tab === "gyms" ? gymsLoading : fightersLoading;
  const searchPlaceholder = tab === "events" ? "Search events, promotions, venues..." : tab === "gyms" ? "Search gyms by name, location..." : "Search fighters...";

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-3 py-4">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
          Next <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="pt-16 flex-1 flex flex-col">
        <section className="py-8 flex-1 flex flex-col">
          <div className="container flex-1 flex flex-col">
            {/* Title + Tabs */}
            <div className={mapOpen ? "container" : ""}>
              <motion.h1 className="font-heading text-4xl md:text-5xl text-foreground mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
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
                    <Input placeholder={searchPlaceholder} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }} className="pl-9" />
                  </div>
                  <Button variant={filtersOpen ? "default" : "outline"} size="icon" onClick={() => setFiltersOpen(!filtersOpen)} className="shrink-0 h-10 w-10">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                  {tab === "gyms" && (
                    <Button
                      variant={mapOpen ? "default" : "outline"}
                      size="icon"
                      onClick={() => { setMapOpen(!mapOpen); setPopupItem(null); setHighlightedGymId(null); }}
                      className="shrink-0 h-10 w-10"
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                  )}
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

            {/* Content area */}
            <div className="flex-1 flex gap-4">
              {/* Directory cards */}
              <div className={`${mapOpen && tab === "gyms" ? "flex-1 overflow-y-auto" : "flex-1"}`}>
                <div className={mapOpen ? "" : "container"}>
                  {tab === "events" && <EventsDirectory events={paginatedItems} isLoading={eventsLoading} searchCoords={pc.coords} />}
                  {tab === "gyms" && <GymsDirectory gyms={paginatedItems} isLoading={gymsLoading} searchCoords={pc.coords} mapOpen={mapOpen} highlightedGymId={highlightedGymId} />}
                  {tab === "fighters" && <FightersDirectory fighters={paginatedItems as any} isLoading={fightersLoading} />}
                  <PaginationControls />
                </div>
              </div>

              {/* Map panel for gyms only */}
              {mapOpen && tab === "gyms" && !isMobile && (
                <div className="shrink-0 rounded-lg border border-border overflow-hidden" style={{ width: "calc(75% - 1rem)", height: 520 }}>
                  <PigeonMap defaultCenter={[53.5, -2.5]} defaultZoom={5.5} height={520}>
                    {mapMarkers.map((m) => (
                      <Marker
                        key={`${m.type}-${m.id}`}
                        anchor={[m.lat, m.lng]}
                        color="hsl(46, 93%, 61%)"
                        width={32}
                        onClick={() => {
                          setPopupItem(m);
                          setHighlightedGymId(m.id);
                          const el = document.getElementById(`gym-card-${m.id}`);
                          el?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                      />
                    ))}
                    {popupItem && (
                      <Overlay anchor={[popupItem.lat, popupItem.lng]} offset={[0, -20]}>
                        <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[180px]" onClick={(e) => e.stopPropagation()}>
                          <p className="font-heading text-sm text-foreground mb-1">{popupItem.name}</p>
                          <p className="text-xs text-muted-foreground mb-2">{popupItem.city}</p>
                          <Badge variant="outline" className="text-[10px] mb-2">{popupItem.type === "event" ? "Event" : "Gym"}</Badge>
                          <div>
                            <Link to={`/gyms/${popupItem.id}`} className="text-xs text-primary hover:underline">View Profile →</Link>
                          </div>
                          <button onClick={() => setPopupItem(null)} className="absolute top-1 right-1 text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </Overlay>
                    )}
                  </PigeonMap>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      {!mapOpen && <Footer />}
    </div>
  );
}

// ── Sub-components ──

function EventsDirectory({ events, isLoading, searchCoords }: { events: any[]; isLoading: boolean; searchCoords?: { latitude: number; longitude: number } | null }) {
  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 rounded-lg bg-card animate-pulse" />)}</div>;
  if (events.length === 0) return <p className="text-muted-foreground text-center py-12">No events found matching your filters.</p>;
  return (
    <div className="space-y-4">
      {events.map((event, i) => {
        const confirmedBouts = event.event_fight_slots?.filter((s: any) => s.status === "confirmed").length ?? 0;
        const openSlots = event.event_fight_slots?.filter((s: any) => !s.fighter_a_id && !s.fighter_b_id && s.status !== "confirmed" && s.status !== "declined").length ?? 0;
        const hasTickets = event.tickets && event.tickets.length > 0;
        const isSoldOut = event.sold_out === true;
        const dist = searchCoords && event.latitude != null && event.longitude != null
          ? haversineDistance(searchCoords.latitude, searchCoords.longitude, event.latitude, event.longitude)
          : null;
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
                    {dist !== null && <span className="text-primary font-medium">{dist.toFixed(1)} mi</span>}
                    {isSoldOut ? (
                      <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">Sold Out</Badge>
                    ) : hasTickets ? (
                      <span className="flex items-center gap-1 text-primary"><Ticket className="h-3.5 w-3.5" /> Tickets</span>
                    ) : event.ticket_count ? (
                      <span className="text-xs text-muted-foreground">{event.ticket_count} tickets</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-6 mt-3 md:mt-0">
                  <div className="text-right">
                    {confirmedBouts > 0 && <span className="block text-foreground font-semibold text-sm">{confirmedBouts} bout{confirmedBouts !== 1 ? "s" : ""} confirmed</span>}
                    {openSlots > 0 && <span className="block text-xs text-primary font-medium">{openSlots} slot{openSlots !== 1 ? "s" : ""} open</span>}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            </motion.div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function GymsDirectory({ gyms, isLoading, searchCoords, mapOpen, highlightedGymId }: { gyms: any[]; isLoading: boolean; searchCoords?: { latitude: number; longitude: number } | null; mapOpen?: boolean; highlightedGymId?: string | null }) {
  const gridClass = mapOpen ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4";
  if (isLoading) return <div className={gridClass}>{[1,2,3,4].map(i => <div key={i} className="h-[220px] rounded-lg bg-card animate-pulse" />)}</div>;
  if (gyms.length === 0) return <p className="text-muted-foreground text-center py-12">No gyms found matching your filters.</p>;
  return (
    <div className={gridClass}>
      {gyms.map((gym, i) => {
        const dist = searchCoords && gym.lat != null && gym.lng != null
          ? haversineDistance(searchCoords.latitude, searchCoords.longitude, gym.lat, gym.lng)
          : null;
        return (
          <motion.div key={gym.id} id={`gym-card-${gym.id}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.03 }}>
            <Link to={`/gyms/${gym.id}`} className={`rounded-lg border bg-card p-5 hover:border-primary/30 transition-all block h-[220px] overflow-hidden relative ${highlightedGymId === gym.id ? "border-primary" : "border-border"}`}>
              {gym.claimed && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              )}
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center font-heading text-sm text-muted-foreground mb-3">
                {gym.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <h3 className="font-heading text-lg text-foreground mb-1 truncate">{gym.name}</h3>
              {gym.discipline_tags && (
                <div className="flex flex-wrap gap-1 mb-1 overflow-hidden max-h-5">
                  {gym.discipline_tags.split(",").slice(0, 3).map((tag: string) => (
                    <span key={tag.trim()} className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-primary/10 text-primary border border-primary/20">{tag.trim()}</span>
                  ))}
                </div>
              )}
              {(gym.city || gym.location) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1 truncate"><MapPin className="h-3 w-3 shrink-0" />{gym.city ? `${gym.city}, ${gym.location || gym.country}` : gym.location}</p>
              )}
              {dist !== null && <p className="text-xs text-primary font-medium mb-1">{dist.toFixed(1)} miles</p>}
              {gym.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{gym.description}</p>}
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{gym.fighter_gym_links?.length ?? 0} fighters</div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

function FightersDirectory({ fighters, isLoading }: { fighters: any[]; isLoading: boolean }) {
  if (isLoading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-[220px] rounded-lg bg-card animate-pulse" />)}</div>;
  if (fighters.length === 0) return <p className="text-muted-foreground text-center py-12">No fighters found.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {fighters.map((fighter, i) => {
        const record = `${fighter._record.wins}-${fighter._record.losses}-${fighter._record.draws}`;
        return (
          <motion.div key={fighter.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.03 }}>
            <Link to={`/fighters/${fighter.id}`} className="rounded-lg border border-border bg-card p-5 hover:border-primary/30 transition-all block h-[220px] overflow-hidden">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center font-heading text-lg text-muted-foreground overflow-hidden shrink-0">
                  {fighter._avatar ? <img src={fighter._avatar} alt={fighter.name} className="h-full w-full object-cover" /> : fighter.name.split(" ").filter((n: string) => !n.startsWith('"')).map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <h3 className="font-heading text-lg text-foreground truncate">{fighter.name}</h3>
              </div>
              <p className="text-primary font-bold text-lg mb-1">{record}</p>
              <p className="text-xs text-muted-foreground truncate">{WEIGHT_CLASS_LABELS[fighter.weight_class] || fighter.weight_class}</p>
              {fighter.style && <p className="text-xs text-muted-foreground truncate">{STYLE_LABELS[fighter.style]}</p>}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
