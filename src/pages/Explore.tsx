import { useState, useMemo, useEffect, useRef } from "react";
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
  SlidersHorizontal, Users, ShieldCheck, Building2, ChevronRight, ChevronLeft, Maximize2,
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

/* ── Explore design tokens (inline, not polluting global CSS) ── */
const EX = {
  bg: "#0d0f12",
  card: "#14171e",
  raised: "#1a1e28",
  border: "rgba(255,255,255,0.06)",
  borderMid: "rgba(255,255,255,0.1)",
  gold: "#e8a020",
  goldDim: "rgba(232,160,32,0.12)",
  goldBorder: "rgba(232,160,32,0.25)",
  text: "#e8eaf0",
  muted: "#8b909e",
  dimmed: "#555b6b",
};

/* Animated counter hook */
function useAnimatedCount(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    if (target <= 0) { setCount(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);
  return count;
}

export default function Explore() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const getInitialTab = (): TabType => {
    if (location.pathname === "/explore/events" || location.pathname === "/events") return "events";
    if (location.pathname === "/explore/fighters" || location.pathname === "/fighters") return "fighters";
    if (location.pathname === "/explore/gyms" || location.pathname === "/gyms") return "gyms";
    return (searchParams.get("tab") as TabType) || "events";
  };

  const [tab, setTab] = useState<TabType>(getInitialTab);
  const [mapOpen, setMapOpen] = useState(false);
  const [highlightedGymId, setHighlightedGymId] = useState<string | null>(null);
  const [popupItem, setPopupItem] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [scrolled, setScrolled] = useState(false);

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

  // Scroll listener for nav glassmorphism
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

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

  // Stats counts
  const gymCount = useAnimatedCount(gyms?.length ?? 0);
  const eventCount = useAnimatedCount(events?.length ?? 0);
  const fighterCount = useAnimatedCount(fighters?.length ?? 0);

  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-3" style={{ padding: "32px 0" }}>
        <button
          disabled={page === 0}
          onClick={() => { setPage(p => p - 1); document.getElementById("gym-map-list")?.scrollTo({ top: 0, behavior: "smooth" }); }}
          style={{
            width: 32, height: 32, borderRadius: "50%", background: EX.raised,
            border: `1px solid ${EX.borderMid}`, display: "flex", alignItems: "center", justifyContent: "center",
            opacity: page === 0 ? 0.3 : 1, cursor: page === 0 ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { if (page > 0) { e.currentTarget.style.background = EX.goldDim; e.currentTarget.style.borderColor = EX.goldBorder; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = EX.raised; e.currentTarget.style.borderColor = EX.borderMid; }}
        >
          <ChevronLeft style={{ width: 14, height: 14, color: page === 0 ? EX.dimmed : EX.text }} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: EX.text }}>
          Page {page + 1} of {totalPages}
        </span>
        <button
          disabled={page >= totalPages - 1}
          onClick={() => { setPage(p => p + 1); document.getElementById("gym-map-list")?.scrollTo({ top: 0, behavior: "smooth" }); }}
          style={{
            width: 32, height: 32, borderRadius: "50%", background: EX.raised,
            border: `1px solid ${EX.borderMid}`, display: "flex", alignItems: "center", justifyContent: "center",
            opacity: page >= totalPages - 1 ? 0.3 : 1, cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { if (page < totalPages - 1) { e.currentTarget.style.background = EX.goldDim; e.currentTarget.style.borderColor = EX.goldBorder; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = EX.raised; e.currentTarget.style.borderColor = EX.borderMid; }}
        >
          <ChevronRight style={{ width: 14, height: 14, color: page >= totalPages - 1 ? EX.dimmed : EX.text }} />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: EX.bg }}>
      <Header />
      <main className="flex-1 flex flex-col" style={{ paddingTop: 56 }}>
        <section className="flex-1 flex flex-col" style={{ padding: "24px 32px" }}>
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { value: gymCount, label: "Elite Gyms" },
              { value: eventCount, label: "Upcoming Events" },
              { value: fighterCount, label: "Active Fighters" },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: EX.card, border: `1px solid ${EX.border}`,
                  borderRadius: 12, padding: 20, textAlign: "center",
                }}
              >
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: EX.gold, textShadow: "0 0 20px rgba(232,160,32,0.25)" }}>
                  {s.value}
                </span>
                <p style={{ fontSize: 12, color: EX.muted, marginTop: 4 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Category Selector Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {([
              { key: "gyms" as TabType, icon: Building2, title: "GYMS", sub: "Find elite training facilities" },
              { key: "events" as TabType, icon: Calendar, title: "EVENTS", sub: "Discover upcoming fight cards" },
              { key: "fighters" as TabType, icon: Users, title: "FIGHTERS", sub: "Explore fighter profiles" },
            ] as const).map((cat) => {
              const isActive = tab === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => handleTabChange(cat.key)}
                  className="text-left transition-all duration-200"
                  style={{
                    background: isActive ? "rgba(232,160,32,0.06)" : EX.card,
                    border: `1px solid ${isActive ? EX.goldBorder : EX.border}`,
                    borderRadius: 12, padding: "28px 24px", cursor: "pointer",
                    overflow: "hidden", transform: isActive ? "translateY(-2px)" : "none",
                  }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(232,160,32,0.06)"; e.currentTarget.style.borderColor = EX.goldBorder; e.currentTarget.style.transform = "translateY(-2px)"; } }}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = EX.card; e.currentTarget.style.borderColor = EX.border; e.currentTarget.style.transform = "none"; } }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: "rgba(232,160,32,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <cat.icon style={{ width: 24, height: 24, color: EX.gold }} />
                  </div>
                  <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: EX.text, marginTop: 16 }}>{cat.title}</p>
                  <p style={{ fontSize: 13, color: EX.muted, marginTop: 4 }}>{cat.sub}</p>
                  <div style={{ width: isActive ? "100%" : 40, height: 2, background: EX.gold, marginTop: 12, transition: "width 0.3s ease" }} />
                </button>
              );
            })}
          </div>

          {/* Search + Filters */}
          <div className="space-y-3 mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: EX.dimmed }} />
                <input
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                  className="w-full outline-none"
                  style={{
                    height: 40, paddingLeft: 36, paddingRight: 12, borderRadius: 8,
                    background: "rgba(255,255,255,0.04)", border: `1px solid ${EX.border}`,
                    color: EX.text, fontSize: 13,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(232,160,32,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(232,160,32,0.08)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = EX.border; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                style={{
                  width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                  background: filtersOpen ? EX.goldDim : "rgba(255,255,255,0.04)",
                  border: `1px solid ${filtersOpen ? EX.goldBorder : EX.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: filtersOpen ? EX.gold : EX.muted, cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <SlidersHorizontal style={{ width: 16, height: 16 }} />
              </button>
              {(tab === "gyms" || tab === "events") && (
                <button
                  onClick={() => { setMapOpen(!mapOpen); setPopupItem(null); setHighlightedGymId(null); }}
                  style={{
                    width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                    background: mapOpen ? EX.goldDim : "rgba(255,255,255,0.04)",
                    border: `1px solid ${mapOpen ? EX.goldBorder : EX.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: mapOpen ? EX.gold : EX.muted, cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  <MapPin style={{ width: 16, height: 16 }} />
                </button>
              )}
            </div>

            <AnimatePresence>
              {filtersOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div style={{ borderRadius: 12, border: `1px solid ${EX.border}`, background: EX.card, padding: "12px 16px" }} className="space-y-4">
                    <div className="flex flex-wrap gap-3 items-center">
                      <Select value={countryFilter} onValueChange={setCountryFilter}>
                        <SelectTrigger className="w-[140px] sm:w-[160px]" style={{ background: "rgba(255,255,255,0.04)", borderColor: EX.border, color: EX.text }}><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Country" /></SelectTrigger>
                        <SelectContent position="popper" side="bottom" style={{ background: EX.raised, borderColor: EX.borderMid }}>
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
                            <Label htmlFor="tickets-filter" className="text-xs cursor-pointer flex items-center gap-1" style={{ color: EX.muted }}><Ticket className="h-3.5 w-3.5" /> Tickets</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch id="unmatched-filter" checked={unmatchedOnly} onCheckedChange={setUnmatchedOnly} />
                            <Label htmlFor="unmatched-filter" className="text-xs cursor-pointer flex items-center gap-1" style={{ color: EX.muted }}><Swords className="h-3.5 w-3.5" /> Open Slots</Label>
                          </div>
                        </>
                      )}

                      {tab === "fighters" && (
                        <>
                          <Select value={weightFilter} onValueChange={setWeightFilter}>
                            <SelectTrigger className="w-[180px]" style={{ background: "rgba(255,255,255,0.04)", borderColor: EX.border, color: EX.text }}><SelectValue placeholder="Weight Class" /></SelectTrigger>
                            <SelectContent position="popper" side="bottom" style={{ background: EX.raised, borderColor: EX.borderMid }}>
                              <SelectItem value="all">All Weights</SelectItem>
                              {Object.entries(WEIGHT_CLASS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={styleFilter} onValueChange={setStyleFilter}>
                            <SelectTrigger className="w-[160px]" style={{ background: "rgba(255,255,255,0.04)", borderColor: EX.border, color: EX.text }}><SelectValue placeholder="Style" /></SelectTrigger>
                            <SelectContent position="popper" side="bottom" style={{ background: EX.raised, borderColor: EX.borderMid }}>
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
                          <MapPin className="h-4 w-4 shrink-0" style={{ color: EX.muted }} />
                          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: EX.muted }}>Location Search</span>
                        </div>
                        <div className="flex gap-2">
                          <input placeholder="Enter UK postcode..." value={pc.postcode} onChange={(e) => pc.setPostcode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && pc.lookup()} className="flex-1 text-sm outline-none" style={{ height: 36, paddingLeft: 12, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${EX.border}`, color: EX.text, fontSize: 13 }} />
                          <button onClick={pc.lookup} disabled={pc.isGeocoding || !pc.postcode.trim()} style={{ height: 36, padding: "0 16px", borderRadius: 8, background: EX.gold, color: EX.bg, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: pc.isGeocoding || !pc.postcode.trim() ? 0.5 : 1 }}>{pc.isGeocoding ? "..." : "Search"}</button>
                          {pc.coords && <button onClick={pc.clear} style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: `1px solid ${EX.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X style={{ width: 16, height: 16, color: EX.muted }} /></button>}
                        </div>
                        {pc.error && <p className="text-xs" style={{ color: "#ef4444" }}>{pc.error}</p>}
                        {pc.coords && (
                          <div className="space-y-2">
                            <span className="text-xs" style={{ color: EX.muted }}>Within <span style={{ color: EX.text, fontWeight: 500 }}>{pc.radius} miles</span> of {pc.coords.postcode}</span>
                            <Slider value={[pc.radius]} onValueChange={([v]) => pc.setRadius(v)} min={1} max={100} step={1} className="w-full" />
                            <div className="flex justify-between text-[10px]" style={{ color: EX.muted }}><span>1 mi</span><span>100 mi</span></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Map Container (when not in split mode) */}
          {!mapOpen && (tab === "gyms" || tab === "events") && mapMarkers.length > 0 && (
            <div style={{ marginBottom: 16, background: EX.card, border: `1px solid ${EX.border}`, borderRadius: 12, overflow: "hidden" }}>
              <div className="flex items-center justify-between" style={{ padding: "12px 16px" }}>
                <div className="flex items-center gap-1.5" style={{ background: "rgba(255,255,255,0.06)", borderRadius: 6, padding: "5px 12px" }}>
                  <MapPin style={{ width: 14, height: 14, color: EX.gold }} />
                  <span style={{ fontSize: 13, color: EX.text }}>{tab === "gyms" ? "Gyms" : "Events"} Locations</span>
                </div>
                <button
                  onClick={() => { setMapOpen(true); setPopupItem(null); }}
                  style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = EX.goldDim; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                >
                  <Maximize2 style={{ width: 14, height: 14, color: EX.muted }} />
                </button>
              </div>
              <div style={{ height: 420 }}>
                <PigeonMap defaultCenter={[53.5, -2.5]} defaultZoom={5.5} height={420}>
                  {mapMarkers.map((m) => (
                    <Marker key={`${m.type}-${m.id}`} anchor={[m.lat, m.lng]} color="hsl(46, 93%, 61%)" width={32} onClick={() => setPopupItem(m)} />
                  ))}
                  {popupItem && (
                    <Overlay anchor={[popupItem.lat, popupItem.lng]} offset={[0, -20]}>
                      <div style={{ background: EX.raised, border: `1px solid ${EX.borderMid}`, borderRadius: 8, padding: "10px 14px", minWidth: 180 }} onClick={(e) => e.stopPropagation()}>
                        <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: EX.text, marginBottom: 4 }}>{popupItem.name}</p>
                        <p style={{ fontSize: 12, color: EX.muted, marginBottom: 8 }}>{popupItem.city}</p>
                        <Link to={tab === "gyms" ? `/gyms/${popupItem.id}` : `/events/${popupItem.id}`} style={{ fontSize: 12, color: EX.gold }}>View →</Link>
                        <button onClick={() => setPopupItem(null)} className="absolute top-1 right-1" style={{ color: EX.muted }}><X className="h-3 w-3" /></button>
                      </div>
                    </Overlay>
                  )}
                </PigeonMap>
              </div>
              <div className="flex items-center gap-3" style={{ padding: "10px 16px", background: "rgba(20,23,30,0.75)", backdropFilter: "blur(10px)", borderTop: `1px solid ${EX.border}` }}>
                <span style={{ fontSize: 12, color: EX.muted }}>Total Locations: {mapMarkers.length}</span>
                <div style={{ width: 1, height: 12, background: EX.border }} />
                <span style={{ fontSize: 12, color: EX.muted }}>Category: <span style={{ color: EX.gold }}>{tab === "gyms" ? "Gyms" : "Events"}</span></span>
              </div>
            </div>
          )}

          {/* Mobile map modal */}
          {mapOpen && (tab === "gyms" || tab === "events") && isMobile && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ padding: 16 }}>
              <div className="fixed inset-0" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }} onClick={() => { setMapOpen(false); setPopupItem(null); }} />
              <div className="relative w-full h-full overflow-hidden z-10" style={{ borderRadius: 12, border: `1px solid ${EX.border}`, background: EX.card }}>
                <button
                  className="absolute top-2 right-2 z-20"
                  onClick={() => { setMapOpen(false); setPopupItem(null); }}
                  style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X style={{ width: 20, height: 20, color: EX.text }} />
                </button>
                <PigeonMap defaultCenter={[53.5, -2.5]} defaultZoom={5.5} height={window.innerHeight - 32}>
                  {mapMarkers.map((m) => (
                    <Marker key={`${m.type}-${m.id}`} anchor={[m.lat, m.lng]} color="hsl(46, 93%, 61%)" width={32} onClick={() => setPopupItem(m)} />
                  ))}
                  {popupItem && (
                    <Overlay anchor={[popupItem.lat, popupItem.lng]} offset={[0, -20]}>
                      <div style={{ background: EX.raised, border: `1px solid ${EX.borderMid}`, borderRadius: 8, padding: "10px 14px", minWidth: 180 }} onClick={(e) => e.stopPropagation()}>
                        <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: EX.text, marginBottom: 4 }}>{popupItem.name}</p>
                        <p style={{ fontSize: 12, color: EX.muted, marginBottom: 8 }}>{popupItem.city}</p>
                        <Link to={tab === "gyms" ? `/gyms/${popupItem.id}` : `/events/${popupItem.id}`} style={{ fontSize: 12, color: EX.gold }}>View →</Link>
                        <button onClick={() => setPopupItem(null)} className="absolute top-1 right-1" style={{ color: EX.muted }}><X className="h-3 w-3" /></button>
                      </div>
                    </Overlay>
                  )}
                </PigeonMap>
              </div>
            </div>
          )}

          {/* Desktop map split layout */}
          {mapOpen && (tab === "gyms" || tab === "events") && !isMobile ? (
            <div className="flex gap-4 flex-1">
              <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
                <div className="overflow-y-auto" style={{ height: 520 }} id="gym-map-list">
                  <div className="space-y-2 pr-1">
                    {paginatedItems.map((item: any) => {
                      const isEvent = tab === "events";
                      const linkTo = isEvent ? `/events/${item.id}` : `/gyms/${item.id}`;
                      const name = isEvent ? item.title : item.name;
                      const loc = isEvent
                        ? (item.city ? `${item.city}, ${item.location || item.country}` : item.location || item.country)
                        : (item.city ? `${item.city}, ${item.country}` : item.location || item.country);
                      return (
                        <Link
                          key={item.id}
                          id={`gym-card-${item.id}`}
                          to={linkTo}
                          className="flex items-center gap-3 p-3 transition-all"
                          style={{
                            borderRadius: 8,
                            background: EX.card,
                            border: `1px solid ${highlightedGymId === item.id ? EX.gold : EX.border}`,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = EX.goldBorder; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = highlightedGymId === item.id ? EX.gold : EX.border; }}
                        >
                          <div style={{ width: 48, height: 48, borderRadius: 8, background: EX.raised, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: EX.muted, flexShrink: 0, overflow: "hidden" }}>
                            {!isEvent && item.logo_url ? (
                              <img src={item.logo_url} alt={name} className="h-full w-full object-cover" />
                            ) : (
                              name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: EX.text }}>{name}</p>
                            <p className="truncate flex items-center gap-1" style={{ fontSize: 12, color: EX.muted }}>
                              <MapPin className="h-3 w-3 shrink-0" />{loc}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
                <PaginationControls />
              </div>
              <div className="shrink-0 overflow-hidden" style={{ width: "60%", height: 520, borderRadius: 12, border: `1px solid ${EX.border}` }}>
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
                      <div style={{ background: EX.raised, border: `1px solid ${EX.borderMid}`, borderRadius: 8, padding: "10px 14px", minWidth: 180 }} onClick={(e) => e.stopPropagation()}>
                        <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: EX.text, marginBottom: 4 }}>{popupItem.name}</p>
                        <p style={{ fontSize: 12, color: EX.muted, marginBottom: 8 }}>{popupItem.city}</p>
                        <Link to={tab === "gyms" ? `/gyms/${popupItem.id}` : `/events/${popupItem.id}`} style={{ fontSize: 12, color: EX.gold }}>View →</Link>
                        <button onClick={() => setPopupItem(null)} className="absolute top-1 right-1" style={{ color: EX.muted }}><X className="h-3 w-3" /></button>
                      </div>
                    </Overlay>
                  )}
                </PigeonMap>
              </div>
            </div>
          ) : (
            <div className="flex-1">
              {tab === "events" && <EventsDirectory events={paginatedItems} isLoading={eventsLoading} searchCoords={pc.coords} />}
              {tab === "gyms" && <GymsDirectory gyms={paginatedItems} isLoading={gymsLoading} searchCoords={pc.coords} mapOpen={false} highlightedGymId={null} />}
              {tab === "fighters" && <FightersDirectory fighters={paginatedItems as any} isLoading={fightersLoading} />}
              <PaginationControls />
            </div>
          )}
        </section>
      </main>
      {!mapOpen && <Footer />}
    </div>
  );
}

// ── Sub-components ──

function EventsDirectory({ events, isLoading, searchCoords }: { events: any[]; isLoading: boolean; searchCoords?: { latitude: number; longitude: number } | null }) {
  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} style={{ height: 320, borderRadius: 12, background: EX.card }} className="animate-pulse" />)}</div>;
  if (events.length === 0) return <p className="text-center py-12" style={{ color: EX.muted }}>No events found matching your filters.</p>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {events.map((event, i) => {
        const confirmedBouts = event.event_fight_slots?.filter((s: any) => s.status === "confirmed").length ?? 0;
        const openSlots = event.event_fight_slots?.filter((s: any) => !s.fighter_a_id && !s.fighter_b_id && s.status !== "confirmed" && s.status !== "declined").length ?? 0;
        const hasTickets = event.tickets && event.tickets.length > 0;
        const isSoldOut = event.sold_out === true;
        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
          >
            <Link
              to={`/events/${event.id}`}
              className="block transition-all duration-200"
              style={{ background: EX.card, border: `1px solid ${EX.border}`, borderRadius: 12, overflow: "hidden", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = EX.goldBorder; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(232,160,32,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = EX.border; e.currentTarget.style.boxShadow = "none"; }}
            >
              {/* Hero area */}
              <div style={{ height: 180, background: EX.raised, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Calendar style={{ width: 32, height: 32, color: "rgba(232,160,32,0.3)" }} />
                {hasTickets && !isSoldOut && (
                  <span style={{ position: "absolute", top: 10, left: 10, background: "rgba(239,68,68,0.85)", backdropFilter: "blur(8px)", color: "white", borderRadius: 9999, padding: "4px 10px", fontSize: 11, fontWeight: 600 }}>Tickets Available</span>
                )}
              </div>
              {/* Body */}
              <div style={{ padding: 16 }}>
                <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: EX.text, textTransform: "uppercase" }}>{event.title}</p>
                {event.description && <p style={{ fontSize: 13, color: EX.muted, marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{event.description}</p>}
                <div className="space-y-1" style={{ marginTop: 12 }}>
                  <div className="flex items-center gap-2"><Calendar style={{ width: 14, height: 14, color: EX.muted }} /><span style={{ fontSize: 12, color: EX.muted }}>{new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></div>
                  <div className="flex items-center gap-2"><MapPin style={{ width: 14, height: 14, color: EX.muted }} /><span style={{ fontSize: 12, color: EX.muted }}>{event.city ? `${event.city}, ${event.location}` : event.location}</span></div>
                </div>
              </div>
              {/* Footer */}
              <div className="flex items-center justify-between" style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: 13, color: EX.gold }}>View Details</span>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: EX.goldDim, border: `1px solid ${EX.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ChevronRight style={{ width: 14, height: 14, color: EX.gold }} />
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

function GymsDirectory({ gyms, isLoading, searchCoords, mapOpen, highlightedGymId }: { gyms: any[]; isLoading: boolean; searchCoords?: { latitude: number; longitude: number } | null; mapOpen?: boolean; highlightedGymId?: string | null }) {
  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} style={{ height: 320, borderRadius: 12, background: EX.card }} className="animate-pulse" />)}</div>;
  if (gyms.length === 0) return <p className="text-center py-12" style={{ color: EX.muted }}>No gyms found matching your filters.</p>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {gyms.map((gym, i) => {
        const dist = searchCoords && gym.lat != null && gym.lng != null
          ? haversineDistance(searchCoords.latitude, searchCoords.longitude, gym.lat, gym.lng)
          : null;
        const tags = gym.discipline_tags ? gym.discipline_tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
        return (
          <motion.div
            key={gym.id}
            id={`gym-card-${gym.id}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
          >
            <Link
              to={`/gyms/${gym.id}`}
              className="block transition-all duration-200"
              style={{ background: EX.card, border: `1px solid ${highlightedGymId === gym.id ? EX.gold : EX.border}`, borderRadius: 12, overflow: "hidden", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = EX.goldBorder; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(232,160,32,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = highlightedGymId === gym.id ? EX.gold : EX.border; e.currentTarget.style.boxShadow = "none"; }}
            >
              {/* Hero */}
              <div style={{ height: 180, background: EX.raised, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: "rgba(232,160,32,0.25)" }}>
                  {gym.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </span>
                {tags.length > 0 && (
                  <div className="absolute bottom-2.5 left-2.5 flex flex-wrap gap-1">
                    {tags.slice(0, 3).map((tag: string) => (
                      <span key={tag} style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", border: `1px solid ${EX.goldBorder}`, color: EX.gold, borderRadius: 9999, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{tag}</span>
                    ))}
                  </div>
                )}
                {gym.claimed && (
                  <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 9999, padding: "3px 10px", fontSize: 10, fontWeight: 600 }}>
                    <ShieldCheck style={{ width: 12, height: 12 }} /> Verified
                  </span>
                )}
              </div>
              {/* Body */}
              <div style={{ padding: 16 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: EX.text }}>{gym.name}</p>
                {gym.description && <p style={{ fontSize: 13, color: EX.muted, marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{gym.description}</p>}
                <div className="space-y-1" style={{ marginTop: 12 }}>
                  {(gym.city || gym.location) && (
                    <div className="flex items-center gap-2"><MapPin style={{ width: 14, height: 14, color: EX.muted }} /><span style={{ fontSize: 12, color: EX.muted }}>{gym.city ? `${gym.city}, ${gym.location || gym.country}` : gym.location}</span></div>
                  )}
                  <div className="flex items-center gap-2"><Users style={{ width: 14, height: 14, color: EX.muted }} /><span style={{ fontSize: 12, color: EX.muted }}>{gym.fighter_gym_links?.length ?? 0} fighters</span></div>
                  {dist !== null && <p style={{ fontSize: 12, color: EX.gold, fontWeight: 500 }}>{dist.toFixed(1)} miles</p>}
                </div>
              </div>
              {/* Footer */}
              <div className="flex items-center justify-between" style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: 13, color: EX.gold }}>View Details</span>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: EX.goldDim, border: `1px solid ${EX.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                  <ChevronRight style={{ width: 14, height: 14, color: EX.gold }} />
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

function FightersDirectory({ fighters, isLoading }: { fighters: any[]; isLoading: boolean }) {
  if (isLoading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} style={{ height: 340, borderRadius: 12, background: EX.card }} className="animate-pulse" />)}</div>;
  if (fighters.length === 0) return <p className="text-center py-12" style={{ color: EX.muted }}>No fighters found.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {fighters.map((fighter, i) => {
        const record = fighter._record;
        const total = record.wins + record.losses + record.draws;
        const winRate = total > 0 ? Math.round((record.wins / total) * 100) : 0;
        const primaryGym = fighter.fighter_gym_links?.find((l: any) => l.is_primary && l.status === "approved");
        const gymName = primaryGym?.gyms?.name ?? "Independent";
        const initials = fighter.name.split(" ").filter((n: string) => !n.startsWith('"')).map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

        return (
          <motion.div
            key={fighter.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
          >
            <Link
              to={`/fighters/${fighter.id}`}
              className="block transition-all duration-200"
              style={{ background: EX.card, border: `1px solid ${EX.border}`, borderRadius: 12, overflow: "hidden", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = EX.goldBorder; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(232,160,32,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = EX.border; e.currentTarget.style.boxShadow = "none"; }}
            >
              {/* Top area */}
              <div style={{ height: 200, background: EX.raised, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* Avatar */}
                <div style={{
                  width: 72, height: 72, borderRadius: "50%", border: "2px solid rgba(232,160,32,0.4)", overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: fighter._avatar ? "transparent" : "linear-gradient(135deg, rgba(232,160,32,0.25), rgba(232,160,32,0.08))",
                }}>
                  {fighter._avatar ? (
                    <img src={fighter._avatar} alt={fighter.name} className="h-full w-full object-cover" />
                  ) : (
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: EX.gold }}>{initials}</span>
                  )}
                </div>
                {/* Win Rate badge */}
                <div className="absolute top-3 right-3" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", borderRadius: 9999, padding: "5px 12px" }}>
                  <span style={{ fontSize: 9, color: EX.muted, display: "block" }}>Win Rate</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: EX.gold }}>{winRate}%</span>
                </div>
              </div>
              {/* Body */}
              <div style={{ padding: 16 }}>
                <p style={{ fontSize: 9, color: EX.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>FIGHTER</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: EX.text }}>{fighter.name}</p>
                <p style={{ fontSize: 12, color: EX.muted, marginTop: 2 }}>{WEIGHT_CLASS_LABELS[fighter.weight_class] || fighter.weight_class}</p>
                <div className="flex items-baseline gap-4" style={{ marginTop: 10 }}>
                  <div>
                    <span style={{ fontSize: 20, fontWeight: 700, color: EX.text }}>{record.wins}-{record.losses}-{record.draws}</span>
                    <span style={{ fontSize: 9, color: EX.dimmed, textTransform: "uppercase", display: "block" }}>WIN-LOSS-DRAW</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5" style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: EX.muted }}>🏆 {gymName}</span>
                </div>
              </div>
              {/* Footer */}
              <div className="flex items-center justify-between" style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: 13, color: EX.gold }}>View Profile</span>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: EX.goldDim, border: `1px solid ${EX.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ChevronRight style={{ width: 14, height: 14, color: EX.gold }} />
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
