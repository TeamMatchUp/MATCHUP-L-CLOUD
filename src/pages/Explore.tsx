import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExploreNav } from "@/components/explore/ExploreNav";
import { ExploreStatsBar } from "@/components/explore/ExploreStatsBar";
import { ExplorePagination } from "@/components/explore/ExplorePagination";
import { GymCard } from "@/components/explore/GymCard";
import { EventCard } from "@/components/explore/EventCard";
import { FighterCard } from "@/components/explore/FighterCard";
import { GymDetailModal } from "@/components/explore/GymDetailModal";
import { EventDetailModal } from "@/components/explore/EventDetailModal";
import { FighterDetailModal } from "@/components/explore/FighterDetailModal";
import { Map as PigeonMap, Marker } from "pigeon-maps";
import { Dumbbell, Calendar, Users, MapPin, Maximize2 } from "lucide-react";
import { STYLE_LABELS } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type CountryCode = Database["public"]["Enums"]["country_code"];
type WeightClass = Database["public"]["Enums"]["weight_class"];
type FightingStyle = Database["public"]["Enums"]["fighting_style"];
type TabType = "gyms" | "events" | "fighters";

const ITEMS_PER_PAGE = 30;

export default function Explore() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialTab = (): TabType => {
    if (location.pathname === "/explore/events") return "events";
    if (location.pathname === "/explore/fighters") return "fighters";
    if (location.pathname === "/explore/gyms") return "gyms";
    return "gyms";
  };

  const [tab, setTab] = useState<TabType>(getInitialTab);
  const [page, setPage] = useState(Number(searchParams.get("page") || "1") - 1);
  const [selectedGym, setSelectedGym] = useState<string | null>(searchParams.get("gym"));
  const [selectedEvent, setSelectedEvent] = useState<string | null>(searchParams.get("event"));
  const [selectedFighter, setSelectedFighter] = useState<string | null>(searchParams.get("fighter"));

  // Sync tab with route
  useEffect(() => {
    if (location.pathname === "/explore/events") setTab("events");
    else if (location.pathname === "/explore/fighters") setTab("fighters");
    else if (location.pathname === "/explore/gyms") setTab("gyms");
  }, [location.pathname]);

  const handleTabChange = (t: TabType) => {
    setTab(t);
    setPage(0);
    const path = t === "gyms" ? "/explore/gyms" : t === "events" ? "/explore/events" : "/explore/fighters";
    navigate(path);
  };

  // Queries
  const { data: gyms = [], isLoading: gymsLoading } = useQuery({
    queryKey: ["explore-gyms-list"],
    queryFn: async () => {
      const { data } = await supabase.from("gyms").select("*, fighter_gym_links(fighter_id)").order("name");
      return data ?? [];
    },
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["explore-events-list"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*, tickets(*)").eq("status", "published").order("date", { ascending: true });
      return data ?? [];
    },
  });

  const { data: fighters = [], isLoading: fightersLoading } = useQuery({
    queryKey: ["explore-fighters-list"],
    queryFn: async () => {
      const { data } = await supabase.from("fighter_profiles").select("*, fighter_gym_links(gym_id, is_primary, status, gyms(name))").order("name");
      const userIds = (data ?? []).map(f => f.user_id).filter(Boolean) as string[];
      let avatarMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, avatar_url").in("id", userIds);
        profiles?.forEach(p => { if (p.avatar_url) avatarMap.set(p.id, p.avatar_url); });
      }
      const fighterIds = (data ?? []).map(f => f.id);
      const { data: fightsA } = await supabase.from("fights").select("*").in("fighter_a_id", fighterIds);
      const { data: fightsB } = await supabase.from("fights").select("*").in("fighter_b_id", fighterIds);
      const fightMap = new Map<string, any>();
      [...(fightsA || []), ...(fightsB || [])].forEach(f => fightMap.set(f.id, f));
      const allFights = Array.from(fightMap.values());
      const recordMap = new Map<string, { wins: number; losses: number; draws: number }>();
      (data ?? []).forEach(fighter => {
        let wins = 0, losses = 0, draws = 0;
        allFights.forEach(fight => {
          const isA = fight.fighter_a_id === fighter.id;
          const isB = fight.fighter_b_id === fighter.id;
          if (!isA && !isB) return;
          if (fight.fighter_a_id === fight.fighter_b_id && !fight.opponent_name) return;
          const isSelfRef = fight.fighter_a_id === fight.fighter_b_id;
          if (fight.winner_id) { if (fight.winner_id === fighter.id) wins++; else losses++; }
          else if (fight.result === "draw") draws++;
          else if (fight.result === "win") { if (isSelfRef || isA) wins++; else losses++; }
          else if (fight.result === "loss") { if (isSelfRef || isA) losses++; else wins++; }
        });
        recordMap.set(fighter.id, { wins, losses, draws });
      });
      return (data ?? []).map(f => ({
        ...f,
        _avatar: f.profile_image || (f.user_id ? avatarMap.get(f.user_id) : null) || null,
        _record: recordMap.get(f.id) || { wins: 0, losses: 0, draws: 0 },
      }));
    },
  });

  const currentItems = tab === "gyms" ? gyms : tab === "events" ? events : fighters;
  const totalPages = Math.ceil(currentItems.length / ITEMS_PER_PAGE);
  const paginatedItems = currentItems.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const isLoading = tab === "gyms" ? gymsLoading : tab === "events" ? eventsLoading : fightersLoading;

  const mapMarkers = useMemo(() => {
    if (tab === "fighters") return [];
    const items = tab === "gyms" ? gyms : events;
    return items.filter((i: any) => {
      const lat = tab === "gyms" ? i.lat : i.latitude;
      const lng = tab === "gyms" ? i.lng : i.longitude;
      return lat != null && lng != null;
    }).map((i: any) => ({
      lat: tab === "gyms" ? i.lat : i.latitude,
      lng: tab === "gyms" ? i.lng : i.longitude,
      id: i.id,
      name: tab === "gyms" ? i.name : i.title,
    }));
  }, [tab, gyms, events]);

  const openModal = (type: "gym" | "event" | "fighter", id: string) => {
    if (type === "gym") { setSelectedGym(id); setSearchParams({ gym: id }); }
    else if (type === "event") { setSelectedEvent(id); setSearchParams({ event: id }); }
    else { setSelectedFighter(id); setSearchParams({ fighter: id }); }
  };

  const closeModal = () => {
    setSelectedGym(null); setSelectedEvent(null); setSelectedFighter(null);
    setSearchParams({});
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    setSearchParams({ page: String(p + 1) });
    document.getElementById("explore-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const isHub = location.pathname === "/explore";
  const isSubPage = !isHub;

  const categories = [
    { key: "gyms" as TabType, icon: Dumbbell, title: "Gyms", subtitle: "Find elite training facilities", path: "/explore/gyms" },
    { key: "events" as TabType, icon: Calendar, title: "Events", subtitle: "Discover upcoming fight cards", path: "/explore/events" },
    { key: "fighters" as TabType, icon: Users, title: "Fighters", subtitle: "Explore fighter profiles", path: "/explore/fighters" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0c" }}>
      <ExploreNav />
      <main style={{ paddingTop: 56 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px" }}>

          {/* Category selector — always shown */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {categories.map((cat) => {
              const active = tab === cat.key;
              const Icon = cat.icon;
              return (
                <div
                  key={cat.key}
                  onClick={() => isHub ? handleTabChange(cat.key) : navigate(cat.path)}
                  className="cursor-pointer transition-all duration-200"
                  style={{
                    background: active ? "rgba(232,160,32,0.06)" : "#14171e",
                    border: `1px solid ${active ? "rgba(232,160,32,0.25)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 12,
                    padding: "28px 24px",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "rgba(232,160,32,0.06)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(232,160,32,0.25)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "#14171e";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
                    }
                  }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: "rgba(232,160,32,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon className="h-6 w-6" style={{ color: "#e8a020" }} />
                  </div>
                  <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "#e8eaf0", marginTop: 16 }}>{cat.title}</h3>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#8b909e", marginTop: 4 }}>{cat.subtitle}</p>
                  <div style={{ width: active ? "100%" : 40, height: 2, background: "#e8a020", marginTop: 12, transition: "width 0.3s" }} />
                </div>
              );
            })}
          </div>

          {/* Map section — hub or sub pages (not fighters) */}
          {tab !== "fighters" && isHub && mapMarkers.length > 0 && (
            <div style={{ background: "#14171e", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
              <div className="flex items-center justify-between" style={{ padding: "12px 16px" }}>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" style={{ color: "#e8a020" }} />
                  <span style={{ background: "rgba(255,255,255,0.06)", borderRadius: 6, padding: "6px 12px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#e8eaf0" }}>
                    {tab === "gyms" ? "Gyms" : "Events"} Locations
                  </span>
                </div>
              </div>
              <PigeonMap defaultCenter={[53.5, -2.5]} defaultZoom={6} height={400}>
                {mapMarkers.map((m) => (
                  <Marker
                    key={m.id}
                    anchor={[m.lat, m.lng]}
                    color="#e8a020"
                    width={32}
                    onClick={() => openModal(tab === "gyms" ? "gym" : "event", m.id)}
                  />
                ))}
              </PigeonMap>
              <div className="flex items-center gap-4" style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(20,23,30,0.7)", backdropFilter: "blur(10px)" }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8b909e" }}>Total Locations: {mapMarkers.length}</span>
                <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8b909e" }}>Category: <span style={{ color: "#e8a020" }}>{tab === "gyms" ? "Gyms" : "Events"}</span></span>
              </div>
            </div>
          )}

          {/* Stats bar on sub pages */}
          {isSubPage && <ExploreStatsBar />}

          {/* Grid */}
          <div id="explore-grid">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="animate-pulse" style={{ height: 320, background: "#14171e", borderRadius: 12 }} />
                ))}
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="text-center py-16">
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#8b909e" }}>
                  No {tab} found.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedItems.map((item: any, i: number) => {
                  if (tab === "gyms") return <GymCard key={item.id} gym={item} index={i} onClick={() => openModal("gym", item.id)} />;
                  if (tab === "events") return <EventCard key={item.id} event={item} index={i} onClick={() => openModal("event", item.id)} />;
                  return <FighterCard key={item.id} fighter={item} index={i} onClick={() => openModal("fighter", item.id)} />;
                })}
              </div>
            )}
            <ExplorePagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </div>
      </main>

      {/* Detail Modals */}
      {selectedGym && <GymDetailModal gymId={selectedGym} onClose={closeModal} />}
      {selectedEvent && <EventDetailModal eventId={selectedEvent} onClose={closeModal} />}
      {selectedFighter && <FighterDetailModal fighterId={selectedFighter} onClose={closeModal} />}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
