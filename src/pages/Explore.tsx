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
import { SearchableCountrySelect } from "@/components/SearchableCountrySelect";
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
import { useAuth } from "@/contexts/AuthContext";
import { useFollow } from "@/hooks/useFollow";
import { useAnalytics } from "@/hooks/useAnalytics";
import logoWhite from "@/assets/logo-full-white.svg";
import iconWhite from "@/assets/icon-white.svg";
import NetworkBackground from "@/components/NetworkBackground";
import { ExploreBanner } from "@/components/ExploreBanner";
import { HazePlaceholder } from "@/components/HazePlaceholder";
import { FlagIcon, getCountryDisplayName } from "@/components/FlagIcon";
import { Award } from "lucide-react";
import { BoostedBadge } from "@/components/BoostedBadge";
import { isEventBoosted, latestBoostCreatedAt } from "@/hooks/useActiveBoost";
import { EventCard } from "@/components/explore/EventCard";
import { GymCard } from "@/components/explore/GymCard";

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

const ITEMS_PER_PAGE_DESKTOP = 30;
const ITEMS_PER_PAGE_MOBILE = 20;

/* ── Explore design tokens (inline, not polluting global CSS) ── */
const EX = {
  bg: "hsl(var(--background))",
  card: "hsl(var(--card))",
  raised: "hsl(var(--muted))",
  border: "transparent",
  borderMid: "transparent",
  gold: "hsl(var(--primary))",
  goldDim: "rgba(239,68,68,0.12)",
  goldBorder: "rgba(239,68,68,0.25)",
  text: "hsl(var(--foreground))",
  muted: "hsl(var(--muted-foreground))",
  dimmed: "hsl(var(--muted-foreground))",
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
  const { track } = useAnalytics();

  const getInitialTab = (): TabType => {
    if (location.pathname === "/explore/events" || location.pathname === "/events") return "events";
    if (location.pathname === "/explore/fighters" || location.pathname === "/fighters") return "fighters";
    if (location.pathname === "/explore/gyms" || location.pathname === "/gyms") return "gyms";
    return (searchParams.get("tab") as TabType) || "events";
  };

  const [tab, setTab] = useState<TabType>(getInitialTab);

  // Keep the active tab in sync with the URL so sidebar navigation between
  // /explore/gyms ↔ /explore/events (and browser back/forward) always shows
  // the right tab — fixes the back-button "swap" issue.
  useEffect(() => {
    const next = getInitialTab();
    setTab((prev) => (prev === next ? prev : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Track page view on mount and tab change
  useEffect(() => {
    void track("explore_page_viewed", { category: tab });
  }, [tab]);

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
  const todayISO = new Date().toISOString().slice(0, 10);
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["explore-events", countryFilter, todayISO],
    queryFn: async () => {
      let q = supabase.from("events").select("*, fight_slots(*), tickets(*), event_fight_slots(id, status, fighter_a_id, fighter_b_id), event_boosts(expires_at, payment_status, created_at)").eq("status", "published").gte("date", todayISO).order("date", { ascending: true });
      if (countryFilter !== "all") q = q.eq("country", countryFilter as CountryCode);
      const { data } = await q;
      const list = data ?? [];

      // Attach organiser avatar/name
      const organiserIds = Array.from(new Set(list.map((e: any) => e.organiser_id).filter(Boolean))) as string[];
      const orgMap = new Map<string, { avatar_url: string | null; full_name: string | null }>();
      if (organiserIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, avatar_url, full_name").in("id", organiserIds);
        (profs ?? []).forEach((p: any) => orgMap.set(p.id, { avatar_url: p.avatar_url, full_name: p.full_name }));
      }
      const enriched = list.map((e: any) => ({
        ...e,
        _organiserAvatar: orgMap.get(e.organiser_id)?.avatar_url ?? null,
        _organiserName: orgMap.get(e.organiser_id)?.full_name ?? null,
      }));

      const boosted: any[] = [];
      const rest: any[] = [];
      for (const ev of enriched) {
        if (isEventBoosted((ev as any).event_boosts)) boosted.push(ev);
        else rest.push(ev);
      }
      boosted.sort((a, b) => latestBoostCreatedAt(b.event_boosts) - latestBoostCreatedAt(a.event_boosts));
      return [...boosted, ...rest];
    },
  });


  const { data: gyms, isLoading: gymsLoading } = useQuery({
    queryKey: ["explore-gyms", countryFilter],
    queryFn: async () => {
      let q = supabase.from("gyms").select("*, fighter_gym_links(fighter_id)").order("name");
      if (countryFilter !== "all") q = q.eq("country", countryFilter as CountryCode);
      const { data } = await q;
      const list = data ?? [];
      const coachIds = Array.from(new Set(list.map((g: any) => g.coach_id).filter(Boolean))) as string[];
      const coachMap = new Map<string, { avatar_url: string | null; full_name: string | null }>();
      if (coachIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, avatar_url, full_name").in("id", coachIds);
        (profs ?? []).forEach((p: any) => coachMap.set(p.id, { avatar_url: p.avatar_url, full_name: p.full_name }));
      }
      return list.map((g: any) => ({
        ...g,
        _coachAvatar: g.coach_id ? coachMap.get(g.coach_id)?.avatar_url ?? null : null,
        _coachName: g.coach_id ? coachMap.get(g.coach_id)?.full_name ?? null : null,
      }));
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

      const recordMap = new Map<string, { wins: number; losses: number; draws: number; stated: boolean }>();
      (data ?? []).forEach((fighter) => {
        let wins = 0, losses = 0, draws = 0, rows = 0;
        allFights.forEach((fight) => {
          const isA = fight.fighter_a_id === fighter.id;
          const isB = fight.fighter_b_id === fighter.id;
          if (!isA && !isB) return;
          rows++;
          if (fight.result === "draw") {
            draws++;
          } else if (fight.winner_id) {
            if (fight.winner_id === fighter.id) wins++; else losses++;
          } else if (fight.result === "win") {
            if (isA) wins++; else losses++;
          } else if (fight.result === "loss") {
            if (isA) losses++; else wins++;
          }
        });
        if (rows === 0) {
          recordMap.set(fighter.id, {
            wins: fighter.record_wins ?? 0,
            losses: fighter.record_losses ?? 0,
            draws: fighter.record_draws ?? 0,
            stated: true,
          });
        } else {
          recordMap.set(fighter.id, { wins, losses, draws, stated: false });
        }
      });

      return (data ?? []).map((f) => ({
        ...f,
        _avatar: f.profile_image || (f.user_id ? avatarMap.get(f.user_id) : null) || null,
        _record: recordMap.get(f.id) || { wins: 0, losses: 0, draws: 0, stated: false },
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
  const pageSize = isMobile ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP;
  const currentItems = tab === "events" ? filteredEvents : tab === "gyms" ? filteredGyms : filteredFighters;
  const totalPages = Math.ceil(currentItems.length / pageSize);
  const paginatedItems = currentItems.slice(page * pageSize, (page + 1) * pageSize);

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

  // Live counts for category cards
  // Live counts — match what explore queries actually return (all published events, all gyms, all fighters)
  const gymLiveCount = gyms?.length ?? 0;
  const eventLiveCount = events?.length ?? 0;
  const fighterLiveCount = fighters?.length ?? 0;

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
        <section className="flex-1 flex flex-col px-4 sm:px-8" style={{ paddingTop: 24, paddingBottom: 24 }}>
          {/* Pill Tab Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-6 flex-nowrap overflow-x-auto">
            {([
              { key: "gyms" as TabType, icon: Building2, title: "Gyms" },
              { key: "fighters" as TabType, icon: Users, title: "Fighters" },
              { key: "events" as TabType, icon: Calendar, title: "Events" },
            ] as const).map((cat) => {
              const isActive = tab === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => handleTabChange(cat.key)}
                  className="inline-flex items-center gap-1.5 sm:gap-2 transition-all duration-200 whitespace-nowrap shrink-0"
                  style={{
                    background: isActive ? EX.goldDim : "rgba(255,255,255,0.04)",
                    color: isActive ? EX.gold : EX.muted,
                    borderRadius: 999,
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    cursor: "pointer",
                    boxShadow: isActive ? "inset 0 0 0 1px rgba(239,68,68,0.35)" : "inset 0 1px 0 rgba(255,255,255,0.03)",
                  }}
                >
                  <cat.icon style={{ width: 14, height: 14 }} />
                  {cat.title}
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
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.08)"; }}
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
                    height: 40, width: isMobile ? 40 : "auto", padding: isMobile ? 0 : "0 14px",
                    borderRadius: 8, flexShrink: 0,
                    background: mapOpen ? EX.goldDim : "rgba(255,255,255,0.04)",
                    border: `1px solid ${mapOpen ? EX.goldBorder : EX.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    color: mapOpen ? EX.gold : EX.muted, cursor: "pointer", transition: "all 0.2s",
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  <MapPin style={{ width: 16, height: 16 }} />
                  {!isMobile && <span>Map</span>}
                </button>

              )}
            </div>

            <AnimatePresence>
              {filtersOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div style={{ borderRadius: 12, border: `1px solid ${EX.border}`, background: EX.card, padding: "12px 16px" }} className="space-y-4">
                    <div className="flex flex-wrap gap-3 items-center">
                      <SearchableCountrySelect value={countryFilter} onValueChange={setCountryFilter} placeholder="Country" includeAll />

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
                        {pc.error && <p className="text-xs" style={{ color: "hsl(var(--primary))" }}>{pc.error}</p>}
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

          {/* Permanent map removed — toggled via Map button in filter bar */}

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

function CardBanner({ image, alt, height = 88 }: { image?: string | null; alt: string; height?: number }) {
  return (
    <div style={{ height, position: "relative", overflow: "hidden" }}>
      {image ? (
        <img src={image} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <HazePlaceholder className="absolute inset-0" />
      )}
    </div>
  );
}

function Avatar({ src, initials, size = 56, ringColor = "rgba(232,160,32,0.45)" }: { src?: string | null; initials: string; size?: number; ringColor?: string }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, rgba(232,160,32,0.25), rgba(239,68,68,0.15))",
        boxShadow: `0 0 0 2px ${ringColor}, 0 4px 12px rgba(0,0,0,0.5)`,
        flexShrink: 0,
      }}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: size * 0.4, color: EX.gold }}>{initials}</span>
      )}
    </div>
  );
}

function initialsOf(name: string) {
  return name.split(" ").filter((n) => !n.startsWith('"')).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const CARD_SHADOW = "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)";
const CARD_SHADOW_HOVER = "0 4px 16px rgba(0,0,0,0.5), 0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(239,68,68,0.12), inset 0 1px 0 rgba(255,255,255,0.06)";

function EventsDirectory({ events, isLoading }: { events: any[]; isLoading: boolean; searchCoords?: { latitude: number; longitude: number } | null }) {
  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} style={{ height: 232, borderRadius: 12, background: EX.card }} className="animate-pulse" />)}</div>;
  if (events.length === 0) return <p className="text-center py-12" style={{ color: EX.muted }}>No events found matching your filters.</p>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {events.map((event, i) => (
        <React.Fragment key={event.id}>
          {i === 15 && <ExploreBanner />}
          <EventCard event={event} index={i} />
        </React.Fragment>
      ))}
    </div>
  );
}

function GymsDirectory({ gyms, isLoading }: { gyms: any[]; isLoading: boolean; searchCoords?: { latitude: number; longitude: number } | null; mapOpen?: boolean; highlightedGymId?: string | null }) {
  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} style={{ height: 232, borderRadius: 12, background: EX.card }} className="animate-pulse" />)}</div>;
  if (gyms.length === 0) return <p className="text-center py-12" style={{ color: EX.muted }}>No gyms found matching your filters.</p>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {gyms.map((gym, i) => <GymCard key={gym.id} gym={gym} index={i} />)}
    </div>
  );
}

function FightersDirectory({ fighters, isLoading }: { fighters: any[]; isLoading: boolean }) {
  const { user } = useAuth();
  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} style={{ height: 240, borderRadius: 12, background: EX.card }} className="animate-pulse" />)}</div>;
  if (fighters.length === 0) return <p className="text-center py-12" style={{ color: EX.muted }}>No fighters found.</p>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {fighters.map((fighter, i) => (
        <FighterCard key={fighter.id} fighter={fighter} index={i} currentUserId={user?.id} />
      ))}
    </div>
  );
}

function computeAge(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function FighterCard({ fighter, index, currentUserId }: { fighter: any; index: number; currentUserId?: string }) {
  const record = fighter._record;
  const { isFollowing, toggle, loading: followLoading } = useFollow(fighter.user_id);
  const showFollow = currentUserId && fighter.user_id && fighter.user_id !== currentUserId;
  const { track: trackAnalytics } = useAnalytics();
  const age = computeAge(fighter.date_of_birth);
  const styleLabel = fighter.style ? STYLE_LABELS[fighter.style] || fighter.style : null;
  const weightLabel = WEIGHT_CLASS_LABELS[fighter.weight_class] || fighter.weight_class;
  const stanceLabel = fighter.stance ? (fighter.stance.charAt(0).toUpperCase() + fighter.stance.slice(1)) : null;
  const isAvailable = fighter.available === true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.24) }}
    >
      <Link
        to={`/fighters/${fighter.id}`}
        className="block transition-all duration-200"
        onClick={() => void trackAnalytics("fighter_card_clicked", { fighter_id: fighter.id })}
        style={{ background: EX.card, borderRadius: 12, overflow: "hidden", cursor: "pointer", boxShadow: CARD_SHADOW }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = CARD_SHADOW_HOVER; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = CARD_SHADOW; }}
      >
        <div style={{ position: "relative" }}>
          <CardBanner image={null} alt={fighter.name} />
          <div style={{ position: "absolute", left: 12, bottom: -22 }}>
            <Avatar src={fighter._avatar} initials={initialsOf(fighter.name)} />
          </div>
        </div>
        <div style={{ padding: "28px 14px 12px", minWidth: 0 }}>
          <div className="flex items-center justify-between gap-2">
            <p title={fighter.name} style={{ fontSize: 15, fontWeight: 700, color: EX.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
              {fighter.name}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                title={isAvailable ? "Available" : "Not available"}
                style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: isAvailable ? "hsl(var(--success))" : "hsl(var(--muted-foreground))",
                  boxShadow: isAvailable ? "0 0 8px rgba(34,197,94,0.6)" : "none",
                }}
              />
              {showFollow && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
                  disabled={followLoading}
                  style={{
                    background: isFollowing ? "rgba(232,160,32,0.15)" : "transparent",
                    border: `1px solid ${EX.gold}`,
                    color: EX.gold,
                    borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </div>
          </div>
          {fighter.country && (
            <div className="flex items-center gap-1.5" style={{ marginTop: 6 }}>
              <FlagIcon countryCode={fighter.country} size={12} />
              <span style={{ fontSize: 11, color: EX.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getCountryDisplayName(fighter.country)}</span>
            </div>
          )}
          {styleLabel && (
            <p style={{ fontSize: 11, color: EX.muted, marginTop: 3 }}>{styleLabel}</p>
          )}
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1" style={{ marginTop: 10, fontSize: 10, color: EX.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {stanceLabel && <span><span style={{ color: EX.dimmed }}>Stance</span> <span style={{ color: EX.text, fontWeight: 600 }}>{stanceLabel}</span></span>}
            <span><span style={{ color: EX.dimmed }}>Wt</span> <span style={{ color: EX.text, fontWeight: 600 }}>{weightLabel}</span></span>
            {age !== null && <span><span style={{ color: EX.dimmed }}>Age</span> <span style={{ color: EX.text, fontWeight: 600 }}>{age}</span></span>}
            <span><span style={{ color: EX.dimmed }}>Rec</span> <span style={{ color: EX.text, fontWeight: 700 }}>{record.wins}-{record.losses}-{record.draws}</span></span>
          </div>
        </div>
        <div className="flex items-center justify-between" style={{ padding: "10px 14px" }}>
          <span style={{ fontSize: 12, color: EX.gold, fontWeight: 600 }}>View Profile</span>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: EX.goldDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronRight style={{ width: 12, height: 12, color: EX.gold }} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

