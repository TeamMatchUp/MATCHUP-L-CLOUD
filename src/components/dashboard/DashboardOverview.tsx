import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EventCalendar } from "./EventCalendar";
import {
  Building2, Plus, Search, Calendar, Inbox, ChevronDown, Eye, EyeOff,
  User, ToggleRight, Crosshair, CalendarPlus, X, Users, UserMinus,
} from "lucide-react";
import { CoachKpiStrip } from "./CoachKpiStrip";
import { CoachUpcomingFights } from "./CoachUpcomingFights";
import { FighterRecordHero } from "./FighterRecordHero";
import { FighterNextFight } from "./FighterNextFight";
import { OrganiserOverviewHero } from "./OrganiserOverviewHero";
import { OrganiserPendingMatches } from "./OrganiserPendingMatches";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DashboardOverviewProps {
  calendarEvents: any[];
  highlightedDates?: string[];
  effectiveRoles: string[];
  onNavigateSection: (section: string) => void;
}

/* ── Quick Actions Button ── */
function QuickActionsButton({ showQuickActions, setShowQuickActions, children }: { showQuickActions: boolean; setShowQuickActions: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 transition-all duration-150"
        style={{
          background: "#e8a020", color: "#0d0f12", borderRadius: 8, padding: "8px 18px",
          fontSize: 13, fontWeight: 600, letterSpacing: "0.02em",
          boxShadow: "0 0 12px rgba(232,160,32,0.25)", cursor: "pointer",
        }}
        onClick={() => setShowQuickActions(!showQuickActions)}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#c47e10"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#e8a020"; }}
      >
        <Plus style={{ width: 16, height: 16 }} />
        Quick Actions
        <ChevronDown style={{ width: 14, height: 14 }} />
      </button>
      {showQuickActions && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowQuickActions(false)} />
          <div className="absolute right-0 top-11 z-50" style={{ minWidth: 220, background: "#1a1e28", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", padding: 8 }}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function DropdownActionItem({ icon: Icon, label, onClick }: { icon: any; label: string; onClick?: () => void }) {
  return (
    <button className="w-full flex items-center gap-2.5 rounded-md transition-colors" style={{ padding: "10px 12px", fontSize: 13, color: "#8b909e" }} onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#e8eaf0"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8b909e"; }}
    ><Icon style={{ width: 16, height: 16 }} />{label}</button>
  );
}

function DropdownActionLink({ icon: Icon, label, to, onClose }: { icon: any; label: string; to: string; onClose: () => void }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 rounded-md transition-colors" style={{ padding: "10px 12px", fontSize: 13, color: "#8b909e" }} onClick={onClose}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#e8eaf0"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8b909e"; }}
    ><Icon style={{ width: 16, height: 16 }} />{label}</Link>
  );
}

function VisibilityToggle({ label, visible, onToggle }: { label: string; visible: boolean; onToggle: () => void }) {
  return (
    <button className="w-full flex items-center justify-between rounded-md transition-colors" style={{ padding: "10px 12px", fontSize: 13, color: "#8b909e" }} onClick={onToggle}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >{label}{visible ? <Eye style={{ width: 14, height: 14, color: "#e8a020" }} /> : <EyeOff style={{ width: 14, height: 14 }} />}</button>
  );
}

function CardWrapper({ visible, children, maxH = "600px" }: { visible: boolean; children: React.ReactNode; maxH?: string }) {
  return (
    <div style={{ opacity: visible ? 1 : 0, maxHeight: visible ? maxH : "0px", overflow: "hidden", transition: "opacity 0.3s ease, max-height 0.3s ease", display: visible ? undefined : "none" }}>
      {children}
    </div>
  );
}

/* ── Global Search ── */
function GlobalSearch() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedTerm(term), 300);
    return () => clearTimeout(debounceRef.current);
  }, [term]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const NAV_ITEMS = [
    { label: "Overview", route: "/dashboard?section=overview" },
    { label: "My Profile", route: "/dashboard?section=my-profile" },
    { label: "Analytics", route: "/dashboard?section=analytics" },
    { label: "Actions", route: "/dashboard?section=actions" },
    { label: "Notifications", route: "/dashboard?section=notifications" },
    { label: "Explore Events", route: "/explore/events" },
    { label: "Explore Gyms", route: "/explore/gyms" },
    { label: "Explore Fighters", route: "/explore/fighters" },
  ];

  const { data: results } = useQuery({
    queryKey: ["global-search", debouncedTerm],
    queryFn: async () => {
      if (!debouncedTerm || debouncedTerm.length < 2) return { pages: [], fighters: [], gyms: [], events: [] };
      const q = debouncedTerm.toLowerCase();
      const pages = NAV_ITEMS.filter(n => n.label.toLowerCase().includes(q));
      const [{ data: fighters }, { data: gyms }, { data: events }] = await Promise.all([
        supabase.from("fighter_profiles").select("name, id, weight_class").ilike("name", `%${debouncedTerm}%`).limit(5),
        supabase.from("gyms").select("name, id, city").ilike("name", `%${debouncedTerm}%`).limit(5),
        supabase.from("events").select("title, id, date").ilike("title", `%${debouncedTerm}%`).eq("status", "published").limit(5),
      ]);
      return { pages, fighters: fighters ?? [], gyms: gyms ?? [], events: events ?? [] };
    },
    enabled: debouncedTerm.length >= 2,
  });

  const hasResults = results && (results.pages.length > 0 || results.fighters.length > 0 || results.gyms.length > 0 || results.events.length > 0);

  const handleSelect = (route: string) => {
    setOpen(false);
    setTerm("");
    navigate(route);
  };

  return (
    <div ref={containerRef} className="relative" style={{ width: 280 }}>
      <div className="flex items-center gap-2" style={{
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 14px",
      }}>
        <Search style={{ width: 14, height: 14, color: "#8b909e", flexShrink: 0 }} />
        <input type="text" placeholder="Search..." value={term}
          onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
          onFocus={() => { if (term.length >= 2) setOpen(true); }}
          className="w-full bg-transparent outline-none border-none" style={{ fontSize: 13, color: "#e8eaf0" }}
        />
      </div>
      {open && term.length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1" style={{
          background: "#1a1e28", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)", maxHeight: 360, overflowY: "auto",
        }}>
          {!hasResults && (
            <p style={{ padding: 12, fontSize: 13, color: "#8b909e" }}>No results for "{term}"</p>
          )}
          {results && results.pages.length > 0 && (
            <>
              <p style={{ padding: "8px 12px 4px", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#555b6b" }}>PAGES</p>
              {results.pages.map((p) => (
                <button key={p.route} className="w-full text-left" style={{ padding: "8px 12px", fontSize: 13, color: "#e8eaf0", cursor: "pointer" }}
                  onClick={() => handleSelect(p.route)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >{p.label}</button>
              ))}
            </>
          )}
          {results && results.fighters.length > 0 && (
            <>
              <p style={{ padding: "8px 12px 4px", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#555b6b" }}>FIGHTERS</p>
              {results.fighters.map((f: any) => (
                <button key={f.id} className="w-full text-left" style={{ padding: "8px 12px", cursor: "pointer" }}
                  onClick={() => handleSelect(`/fighters/${f.id}`)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 13, color: "#e8eaf0" }}>{f.name}</span>
                  <span style={{ fontSize: 11, color: "#8b909e", marginLeft: 8 }}>{f.weight_class}</span>
                </button>
              ))}
            </>
          )}
          {results && results.gyms.length > 0 && (
            <>
              <p style={{ padding: "8px 12px 4px", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#555b6b" }}>GYMS</p>
              {results.gyms.map((g: any) => (
                <button key={g.id} className="w-full text-left" style={{ padding: "8px 12px", cursor: "pointer" }}
                  onClick={() => handleSelect(`/gyms/${g.id}`)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 13, color: "#e8eaf0" }}>{g.name}</span>
                  {g.city && <span style={{ fontSize: 11, color: "#8b909e", marginLeft: 8 }}>{g.city}</span>}
                </button>
              ))}
            </>
          )}
          {results && results.events.length > 0 && (
            <>
              <p style={{ padding: "8px 12px 4px", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#555b6b" }}>EVENTS</p>
              {results.events.map((e: any) => (
                <button key={e.id} className="w-full text-left" style={{ padding: "8px 12px", cursor: "pointer" }}
                  onClick={() => handleSelect(`/events/${e.id}`)}
                  onMouseEnter={(ev) => { ev.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 13, color: "#e8eaf0" }}>{e.title}</span>
                  {e.date && <span style={{ fontSize: 11, color: "#8b909e", marginLeft: 8 }}>{new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Network Modal ── */
function NetworkModal({ type, userId, onClose }: { type: "followers" | "following"; userId: string; onClose: () => void }) {
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: [type === "followers" ? "followers-list" : "following-list", userId],
    queryFn: async () => {
      if (type === "followers") {
        const { data } = await supabase.from("user_follows").select("follower_id").eq("following_id", userId).order("created_at", { ascending: false });
        if (!data || data.length === 0) return [];
        const ids = data.map(d => d.follower_id);
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
        return (profiles ?? []).map(p => ({ userId: p.id, name: p.full_name, avatar: p.avatar_url }));
      } else {
        const { data } = await supabase.from("user_follows").select("following_id").eq("follower_id", userId).order("created_at", { ascending: false });
        if (!data || data.length === 0) return [];
        const ids = data.map(d => d.following_id);
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
        return (profiles ?? []).map(p => ({ userId: p.id, name: p.full_name, avatar: p.avatar_url }));
      }
    },
  });

  const handleUnfollow = async (targetId: string) => {
    await supabase.from("user_follows").delete().eq("follower_id", userId).eq("following_id", targetId);
    queryClient.invalidateQueries({ queryKey: ["following-list"] });
    queryClient.invalidateQueries({ queryKey: ["following-count"] });
    queryClient.invalidateQueries({ queryKey: ["overview-following-count"] });
    queryClient.invalidateQueries({ queryKey: ["overview-follower-count"] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#14171e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, width: "min(480px, 95vw)", maxHeight: "70vh", overflowY: "auto", padding: 20 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#e8eaf0" }}>{type === "followers" ? "Followers" : "Following"}</h3>
          <button onClick={onClose} style={{ color: "#8b909e", cursor: "pointer" }}><X style={{ width: 20, height: 20 }} /></button>
        </div>
        {items.length === 0 && (
          <div className="text-center py-8">
            <Users style={{ width: 32, height: 32, color: "#555b6b", margin: "0 auto 8px" }} />
            <p style={{ fontSize: 13, color: "#8b909e" }}>{type === "followers" ? "No followers yet" : "Not following anyone"}</p>
          </div>
        )}
        <div className="space-y-2">
          {items.map((item: any) => (
            <div key={item.userId} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
            >
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #e8a020, #c47e10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "white", overflow: "hidden", flexShrink: 0 }}>
                {item.avatar ? <img src={item.avatar} alt="" className="h-full w-full object-cover" /> : (item.name || "?").slice(0, 2).toUpperCase()}
              </div>
              <span className="flex-1 truncate" style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0" }}>{item.name || "Unknown"}</span>
              {type === "following" && (
                <button onClick={() => handleUnfollow(item.userId)} style={{ fontSize: 11, fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                  Unfollow
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export function DashboardOverview({
  calendarEvents,
  highlightedDates = [],
  effectiveRoles,
  onNavigateSection,
}: DashboardOverviewProps) {
  const { user } = useAuth();
  const isCoachOrOwner = effectiveRoles.includes("gym_owner") || effectiveRoles.includes("coach");
  const isOrganiser = effectiveRoles.includes("organiser");
  const isFighter = effectiveRoles.includes("fighter");

  const { data: profileData } = useQuery({
    queryKey: ["overview-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("avatar_url, full_name").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: followerCount = 0 } = useQuery({
    queryKey: ["overview-follower-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("user_follows").select("id", { count: "exact", head: true }).eq("following_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ["overview-following-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("user_follows").select("id", { count: "exact", head: true }).eq("follower_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: roleStat = 0 } = useQuery({
    queryKey: ["overview-role-stat", user?.id, isCoachOrOwner, isFighter, isOrganiser],
    queryFn: async () => {
      if (isFighter && !isCoachOrOwner) {
        const { data: fp } = await supabase.from("fighter_profiles").select("id").eq("user_id", user!.id).maybeSingle();
        if (!fp) return 0;
        const { data: rec } = await supabase.from("fighter_records").select("wins, losses, draws").eq("fighter_id", fp.id).maybeSingle();
        return rec ? (rec.wins + rec.losses + rec.draws) : 0;
      }
      if (isCoachOrOwner) {
        const { data: gyms } = await supabase.from("gyms").select("id").eq("coach_id", user!.id);
        const gymIds = (gyms ?? []).map(g => g.id);
        if (gymIds.length === 0) return 0;
        const { count } = await supabase.from("fighter_gym_links").select("id", { count: "exact", head: true }).in("gym_id", gymIds).eq("status", "approved");
        return count ?? 0;
      }
      if (isOrganiser) {
        const { count } = await supabase.from("events").select("id", { count: "exact", head: true }).eq("organiser_id", user!.id);
        return count ?? 0;
      }
      return 0;
    },
    enabled: !!user,
  });

  const roleLabel = isCoachOrOwner ? "Coach" : isFighter ? "Fighter" : isOrganiser ? "Organiser" : "User";
  const roleStatLabel = isCoachOrOwner ? "Fighters" : isFighter ? "Fights" : "Events";
  const initials = (profileData?.full_name || "U").slice(0, 2).toUpperCase();

  const [showQuickActions, setShowQuickActions] = useState(false);
  const [fighterCardVis, setFighterCardVis] = useState({ record: true, nextFight: true, calendar: true });
  const [coachCardVis, setCoachCardVis] = useState({ kpis: true, fights: true, calendar: true });
  const [orgCardVis, setOrgCardVis] = useState({ stats: true, pending: true, calendar: true });
  const [scrolled, setScrolled] = useState(false);
  const [networkModal, setNetworkModal] = useState<"followers" | "following" | null>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const StickyHeader = ({ quickActionsContent }: { quickActionsContent: React.ReactNode }) => (
    <div style={{
      position: "sticky", top: 0, zIndex: 40,
      background: scrolled ? "rgba(13,15,18,0.85)" : "#0d0f12",
      backdropFilter: scrolled ? "blur(16px) saturate(180%)" : "none",
      borderBottom: `1px solid rgba(255,255,255,${scrolled ? 0.08 : 0.06})`,
      boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.3)" : "none",
      padding: "12px 24px",
      transition: "all 0.3s ease",
    }}>
      {/* Row 1: Search + Quick Actions */}
      <div className="flex items-center justify-end gap-3">
        <GlobalSearch />
        <QuickActionsButton showQuickActions={showQuickActions} setShowQuickActions={setShowQuickActions}>
          {quickActionsContent}
        </QuickActionsButton>
      </div>
    </div>
  );

  const ProfileSection = () => (
    <div className="flex items-center gap-4" style={{ padding: "16px 24px 20px" }}>
      <div className="shrink-0" style={{
        width: 64, height: 64, borderRadius: "50%",
        border: "2px solid rgba(232,160,32,0.4)", boxShadow: "0 0 20px rgba(232,160,32,0.15)",
        overflow: "hidden", background: "linear-gradient(135deg, #e8a020, #c47e10)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {profileData?.avatar_url ? (
          <img src={profileData.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ color: "white", fontSize: 20, fontWeight: 700 }}>{initials}</span>
        )}
      </div>
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, color: "#e8eaf0", lineHeight: 1.2 }}>{profileData?.full_name || "User"}</p>
        <div className="flex items-center gap-5" style={{ marginTop: 4 }}>
          <button onClick={() => setNetworkModal("followers")} className="transition-colors" style={{ cursor: "pointer" }}
            onMouseEnter={(e) => { (e.currentTarget.querySelector('.stat-val') as any).style.color = "#e8a020"; }}
            onMouseLeave={(e) => { (e.currentTarget.querySelector('.stat-val') as any).style.color = "#e8eaf0"; }}
          >
            <span className="stat-val" style={{ fontSize: 14, fontWeight: 700, color: "#e8eaf0", transition: "color 0.2s" }}>{followerCount}</span>
            <span style={{ fontSize: 12, color: "#8b909e", marginLeft: 4 }}>Followers</span>
          </button>
          <button onClick={() => setNetworkModal("following")} className="transition-colors" style={{ cursor: "pointer" }}
            onMouseEnter={(e) => { (e.currentTarget.querySelector('.stat-val') as any).style.color = "#e8a020"; }}
            onMouseLeave={(e) => { (e.currentTarget.querySelector('.stat-val') as any).style.color = "#e8eaf0"; }}
          >
            <span className="stat-val" style={{ fontSize: 14, fontWeight: 700, color: "#e8eaf0", transition: "color 0.2s" }}>{followingCount}</span>
            <span style={{ fontSize: 12, color: "#8b909e", marginLeft: 4 }}>Following</span>
          </button>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#e8eaf0" }}>{roleStat}</span>
            <span style={{ fontSize: 12, color: "#8b909e", marginLeft: 4 }}>{roleStatLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const quickActionsFighter = (
    <>
      <DropdownActionItem icon={User} label="Edit Profile" onClick={() => { setShowQuickActions(false); onNavigateSection("my-profile"); }} />
      <DropdownActionItem icon={ToggleRight} label="Set Availability" onClick={() => { setShowQuickActions(false); onNavigateSection("my-profile"); }} />
      <DropdownActionLink icon={Crosshair} label="Find Opponents" to="/explore?tab=fighters" onClose={() => setShowQuickActions(false)} />
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "6px 0" }} />
      <p style={{ padding: "6px 12px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#555b6b" }}>KPI VISIBILITY</p>
      <VisibilityToggle label="Fight Record Card" visible={fighterCardVis.record} onToggle={() => setFighterCardVis(p => ({ ...p, record: !p.record }))} />
      <VisibilityToggle label="Next Fight Card" visible={fighterCardVis.nextFight} onToggle={() => setFighterCardVis(p => ({ ...p, nextFight: !p.nextFight }))} />
      <VisibilityToggle label="Calendar Card" visible={fighterCardVis.calendar} onToggle={() => setFighterCardVis(p => ({ ...p, calendar: !p.calendar }))} />
    </>
  );

  const quickActionsCoach = (
    <>
      <DropdownActionLink icon={Building2} label="Create Gym" to="/register-gym?from=overview" onClose={() => setShowQuickActions(false)} />
      <DropdownActionLink icon={Calendar} label="Create Event" to="/organiser/create-event?from=overview" onClose={() => setShowQuickActions(false)} />
      <DropdownActionItem icon={Plus} label="Add Fighter" onClick={() => { setShowQuickActions(false); onNavigateSection("roster"); }} />
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "6px 0" }} />
      <p style={{ padding: "6px 12px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#555b6b" }}>KPI VISIBILITY</p>
      <VisibilityToggle label="KPIs Card" visible={coachCardVis.kpis} onToggle={() => setCoachCardVis(p => ({ ...p, kpis: !p.kpis }))} />
      <VisibilityToggle label="Fights Card" visible={coachCardVis.fights} onToggle={() => setCoachCardVis(p => ({ ...p, fights: !p.fights }))} />
      <VisibilityToggle label="Calendar Card" visible={coachCardVis.calendar} onToggle={() => setCoachCardVis(p => ({ ...p, calendar: !p.calendar }))} />
    </>
  );

  const quickActionsOrg = (
    <>
      <DropdownActionLink icon={CalendarPlus} label="Create Event" to="/organiser/create-event?from=overview" onClose={() => setShowQuickActions(false)} />
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "6px 0" }} />
      <p style={{ padding: "6px 12px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#555b6b" }}>KPI VISIBILITY</p>
      <VisibilityToggle label="Overview Stats Card" visible={orgCardVis.stats} onToggle={() => setOrgCardVis(p => ({ ...p, stats: !p.stats }))} />
      <VisibilityToggle label="Pending Matches Card" visible={orgCardVis.pending} onToggle={() => setOrgCardVis(p => ({ ...p, pending: !p.pending }))} />
      <VisibilityToggle label="Calendar Card" visible={orgCardVis.calendar} onToggle={() => setOrgCardVis(p => ({ ...p, calendar: !p.calendar }))} />
    </>
  );

  // ═══ FIGHTER ═══
  if (isFighter && !isCoachOrOwner) {
    return (
      <div>
        <StickyHeader quickActionsContent={quickActionsFighter} />
        <ProfileSection />
        <div className="space-y-4" style={{ padding: "0 24px" }}>
          <CardWrapper visible={fighterCardVis.record}><FighterRecordHero /></CardWrapper>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {fighterCardVis.nextFight && <div className="lg:col-span-3"><FighterNextFight /></div>}
            {fighterCardVis.calendar && <div className={fighterCardVis.nextFight ? "lg:col-span-2" : "lg:col-span-5"}><EventCalendar events={calendarEvents} highlightedDates={highlightedDates} /></div>}
          </div>
        </div>
        {networkModal && user && <NetworkModal type={networkModal} userId={user.id} onClose={() => setNetworkModal(null)} />}
      </div>
    );
  }

  // ═══ COACH ═══
  if (isCoachOrOwner) {
    return (
      <div>
        <StickyHeader quickActionsContent={quickActionsCoach} />
        <ProfileSection />
        <div className="space-y-4" style={{ padding: "0 24px" }}>
          <CardWrapper visible={coachCardVis.kpis} maxH="400px"><CoachKpiStrip /></CardWrapper>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {coachCardVis.fights && <div className={coachCardVis.calendar ? "lg:col-span-3" : "lg:col-span-5"}><CoachUpcomingFights /></div>}
            {coachCardVis.calendar && <div className={coachCardVis.fights ? "lg:col-span-2" : "lg:col-span-5"}><EventCalendar events={calendarEvents} highlightedDates={highlightedDates} /></div>}
          </div>
        </div>
        {networkModal && user && <NetworkModal type={networkModal} userId={user.id} onClose={() => setNetworkModal(null)} />}
      </div>
    );
  }

  // ═══ ORGANISER ═══
  if (isOrganiser) {
    return (
      <div>
        <StickyHeader quickActionsContent={quickActionsOrg} />
        <ProfileSection />
        <div className="space-y-4" style={{ padding: "0 24px" }}>
          <CardWrapper visible={orgCardVis.stats}><OrganiserOverviewHero /></CardWrapper>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {orgCardVis.pending && <div className={orgCardVis.calendar ? "lg:col-span-3" : "lg:col-span-5"}><OrganiserPendingMatches /></div>}
            {orgCardVis.calendar && <div className={orgCardVis.pending ? "lg:col-span-2" : "lg:col-span-5"}><EventCalendar events={calendarEvents} highlightedDates={highlightedDates} /></div>}
          </div>
        </div>
        {networkModal && user && <NetworkModal type={networkModal} userId={user.id} onClose={() => setNetworkModal(null)} />}
      </div>
    );
  }

  // ═══ DEFAULT ═══
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><EventCalendar events={calendarEvents} highlightedDates={highlightedDates} /></div>
        <div className="space-y-4">
          <div className="coach-card p-4">
            <h3 className="font-heading text-lg text-foreground mb-3">QUICK <span style={{ color: "#e8a020" }}>ACTIONS</span></h3>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="justify-start gap-2 h-10" asChild><Link to="/explore?tab=events"><Search className="h-4 w-4 text-primary" />Browse Events</Link></Button>
              <Button variant="outline" className="justify-start gap-2 h-10" onClick={() => onNavigateSection("actions")}><Inbox className="h-4 w-4 text-primary" />View Actions</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
