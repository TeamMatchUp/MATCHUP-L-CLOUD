import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EventCalendar } from "./EventCalendar";
import {
  Building2,
  Plus,
  Search,
  Calendar,
  Inbox,
  ChevronDown,
  Eye,
  EyeOff,
  User,
  ToggleRight,
  Crosshair,
  CalendarPlus,
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { AppIcon } from "@/components/AppIcon";
import { CoachKpiStrip } from "./CoachKpiStrip";
import { CoachUpcomingFights } from "./CoachUpcomingFights";
import { FighterRecordHero } from "./FighterRecordHero";
import { FighterNextFight } from "./FighterNextFight";
import { OrganiserOverviewHero } from "./OrganiserOverviewHero";
import { OrganiserPendingMatches } from "./OrganiserPendingMatches";
import { DashboardNetwork } from "./DashboardNetwork";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DashboardOverviewProps {
  calendarEvents: any[];
  highlightedDates?: string[];
  effectiveRoles: string[];
  onNavigateSection: (section: string) => void;
}

function QuickActionsButton({ showQuickActions, setShowQuickActions, children }: { showQuickActions: boolean; setShowQuickActions: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 transition-all duration-150"
        style={{
          background: "transparent",
          border: "1.5px solid #e8a020",
          color: "#e8a020",
          borderRadius: 8,
          padding: "8px 18px",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.02em",
          boxShadow: "0 0 12px rgba(232,160,32,0.15)",
          cursor: "pointer",
        }}
        onClick={() => setShowQuickActions(!showQuickActions)}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(232,160,32,0.08)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(232,160,32,0.25)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.boxShadow = "0 0 12px rgba(232,160,32,0.15)"; }}
      >
        <Plus style={{ width: 16, height: 16 }} />
        Quick Actions
        <ChevronDown style={{ width: 14, height: 14 }} />
      </button>
      {showQuickActions && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowQuickActions(false)} />
          <div
            className="absolute right-0 top-11 z-50"
            style={{
              minWidth: 220,
              background: "#1a1e28",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              padding: 8,
            }}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function TopNavBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-end -mt-2 mb-2"
      style={{
        height: 56,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 4px",
      }}
    >
      {children}
    </div>
  );
}

function DropdownActionItem({ icon: Icon, label, onClick }: { icon: any; label: string; onClick?: () => void }) {
  return (
    <button
      className="w-full flex items-center gap-2.5 rounded-md transition-colors"
      style={{ padding: "10px 12px", fontSize: 13, color: "#8b909e" }}
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#e8eaf0"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8b909e"; }}
    >
      <Icon style={{ width: 16, height: 16 }} />
      {label}
    </button>
  );
}

function DropdownActionLink({ icon: Icon, label, to, onClose }: { icon: any; label: string; to: string; onClose: () => void }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-md transition-colors"
      style={{ padding: "10px 12px", fontSize: 13, color: "#8b909e" }}
      onClick={onClose}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#e8eaf0"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8b909e"; }}
    >
      <Icon style={{ width: 16, height: 16 }} />
      {label}
    </Link>
  );
}

function VisibilityToggle({ label, visible, onToggle }: { label: string; visible: boolean; onToggle: () => void }) {
  return (
    <button
      className="w-full flex items-center justify-between rounded-md transition-colors"
      style={{ padding: "10px 12px", fontSize: 13, color: "#8b909e" }}
      onClick={onToggle}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {label}
      {visible ? (
        <Eye style={{ width: 14, height: 14, color: "#e8a020" }} />
      ) : (
        <EyeOff style={{ width: 14, height: 14 }} />
      )}
    </button>
  );
}

function CardWrapper({ visible, children, maxH = "600px" }: { visible: boolean; children: React.ReactNode; maxH?: string }) {
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        maxHeight: visible ? maxH : "0px",
        overflow: "hidden",
        transition: "opacity 0.3s ease, max-height 0.3s ease",
        display: visible ? undefined : "none",
      }}
    >
      {children}
    </div>
  );
}

function ProfileHero({
  avatarUrl,
  fullName,
  roleLabel,
  followerCount,
  followingCount,
  roleStat,
  roleStatLabel,
}: {
  avatarUrl?: string | null;
  fullName?: string | null;
  roleLabel: string;
  followerCount: number;
  followingCount: number;
  roleStat: number;
  roleStatLabel: string;
}) {
  const initials = (fullName || "U").slice(0, 2).toUpperCase();
  return (
    <div
      className="flex items-center gap-5"
      style={{
        padding: "0 0 24px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        marginBottom: 24,
      }}
    >
      {/* Avatar */}
      <div
        className="shrink-0"
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: "2px solid rgba(232,160,32,0.4)",
          boxShadow: "0 0 20px rgba(232,160,32,0.15)",
          overflow: "hidden",
          background: "linear-gradient(135deg, #e8a020, #c47e10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={fullName || "User"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ color: "white", fontSize: 20, fontWeight: 700 }}>{initials}</span>
        )}
      </div>
      {/* Info */}
      <div>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#e8eaf0", lineHeight: 1.2 }}>
          {fullName || "User"}
        </p>
        <span
          style={{
            display: "inline-block",
            background: "rgba(232,160,32,0.12)",
            border: "1px solid rgba(232,160,32,0.25)",
            color: "#e8a020",
            borderRadius: 20,
            padding: "2px 10px",
            fontSize: 11,
            fontWeight: 600,
            marginTop: 4,
          }}
        >
          {roleLabel}
        </span>
        <div className="flex items-center gap-6" style={{ marginTop: 10 }}>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#e8eaf0", display: "block" }}>{followerCount}</span>
            <span style={{ fontSize: 11, color: "#8b909e" }}>Followers</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#e8eaf0", display: "block" }}>{followingCount}</span>
            <span style={{ fontSize: 11, color: "#8b909e" }}>Following</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#e8eaf0", display: "block" }}>{roleStat}</span>
            <span style={{ fontSize: 11, color: "#8b909e" }}>{roleStatLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  // ═══════════════════════════════════════
  // FIGHTER OVERVIEW
  // ═══════════════════════════════════════
  if (isFighter && !isCoachOrOwner) {
    return (
      <div className="space-y-4">
        <ProfileHero avatarUrl={profileData?.avatar_url} fullName={profileData?.full_name} roleLabel={roleLabel} followerCount={followerCount} followingCount={followingCount} roleStat={roleStat} roleStatLabel={roleStatLabel} />
        <TopNavBar>
          <QuickActionsButton showQuickActions={showQuickActions} setShowQuickActions={setShowQuickActions}>
            <DropdownActionItem icon={User} label="Edit Profile" onClick={() => { setShowQuickActions(false); onNavigateSection("my-profile"); }} />
            <DropdownActionItem icon={ToggleRight} label="Set Availability" onClick={() => { setShowQuickActions(false); onNavigateSection("my-profile"); }} />
            <DropdownActionLink icon={Crosshair} label="Find Opponents" to="/explore?tab=fighters" onClose={() => setShowQuickActions(false)} />
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "6px 0" }} />
            <p style={{ padding: "6px 12px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#555b6b" }}>KPI VISIBILITY</p>
            <VisibilityToggle label="Fight Record Card" visible={fighterCardVis.record} onToggle={() => setFighterCardVis((p) => ({ ...p, record: !p.record }))} />
            <VisibilityToggle label="Next Fight Card" visible={fighterCardVis.nextFight} onToggle={() => setFighterCardVis((p) => ({ ...p, nextFight: !p.nextFight }))} />
            <VisibilityToggle label="Calendar Card" visible={fighterCardVis.calendar} onToggle={() => setFighterCardVis((p) => ({ ...p, calendar: !p.calendar }))} />
          </QuickActionsButton>
        </TopNavBar>

        <CardWrapper visible={fighterCardVis.record}>
          <FighterRecordHero />
        </CardWrapper>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {fighterCardVis.nextFight && (
            <div className="lg:col-span-3">
              <FighterNextFight />
            </div>
          )}
          {fighterCardVis.calendar && (
            <div className={fighterCardVis.nextFight ? "lg:col-span-2" : "lg:col-span-5"}>
              <EventCalendar events={calendarEvents} highlightedDates={highlightedDates} />
            </div>
          )}
        </div>

        <DashboardNetwork />
      </div>
    );
  }

  // ═══════════════════════════════════════
  // COACH / GYM OWNER OVERVIEW
  // ═══════════════════════════════════════
  if (isCoachOrOwner) {
    return (
      <div className="space-y-4">
        <ProfileHero avatarUrl={profileData?.avatar_url} fullName={profileData?.full_name} roleLabel={roleLabel} followerCount={followerCount} followingCount={followingCount} roleStat={roleStat} roleStatLabel={roleStatLabel} />
        <TopNavBar>
          <QuickActionsButton showQuickActions={showQuickActions} setShowQuickActions={setShowQuickActions}>
            <DropdownActionLink icon={Building2} label="Create Gym" to="/register-gym?from=overview" onClose={() => setShowQuickActions(false)} />
            <DropdownActionLink icon={Calendar} label="Create Event" to="/organiser/create-event?from=overview" onClose={() => setShowQuickActions(false)} />
            <DropdownActionItem icon={Plus} label="Add Fighter" onClick={() => { setShowQuickActions(false); onNavigateSection("roster"); }} />
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "6px 0" }} />
            <p style={{ padding: "6px 12px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#555b6b" }}>KPI VISIBILITY</p>
            <VisibilityToggle label="KPIs Card" visible={coachCardVis.kpis} onToggle={() => setCoachCardVis((p) => ({ ...p, kpis: !p.kpis }))} />
            <VisibilityToggle label="Fights Card" visible={coachCardVis.fights} onToggle={() => setCoachCardVis((p) => ({ ...p, fights: !p.fights }))} />
            <VisibilityToggle label="Calendar Card" visible={coachCardVis.calendar} onToggle={() => setCoachCardVis((p) => ({ ...p, calendar: !p.calendar }))} />
          </QuickActionsButton>
        </TopNavBar>

        <CardWrapper visible={coachCardVis.kpis} maxH="400px">
          <CoachKpiStrip />
        </CardWrapper>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {coachCardVis.fights && (
            <div className={coachCardVis.calendar ? "lg:col-span-3" : "lg:col-span-5"}>
              <CoachUpcomingFights />
            </div>
          )}
          {coachCardVis.calendar && (
            <div className={coachCardVis.fights ? "lg:col-span-2" : "lg:col-span-5"}>
              <EventCalendar events={calendarEvents} highlightedDates={highlightedDates} />
            </div>
          )}
        </div>

        <DashboardNetwork />
      </div>
    );
  }

  // ═══════════════════════════════════════
  // ORGANISER OVERVIEW
  // ═══════════════════════════════════════
  if (isOrganiser) {
    return (
      <div className="space-y-4">
        <TopNavBar>
          <QuickActionsButton showQuickActions={showQuickActions} setShowQuickActions={setShowQuickActions}>
            <DropdownActionLink icon={CalendarPlus} label="Create Event" to="/organiser/create-event?from=overview" onClose={() => setShowQuickActions(false)} />
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "6px 0" }} />
            <p style={{ padding: "6px 12px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#555b6b" }}>KPI VISIBILITY</p>
            <VisibilityToggle label="Overview Stats Card" visible={orgCardVis.stats} onToggle={() => setOrgCardVis((p) => ({ ...p, stats: !p.stats }))} />
            <VisibilityToggle label="Pending Matches Card" visible={orgCardVis.pending} onToggle={() => setOrgCardVis((p) => ({ ...p, pending: !p.pending }))} />
            <VisibilityToggle label="Calendar Card" visible={orgCardVis.calendar} onToggle={() => setOrgCardVis((p) => ({ ...p, calendar: !p.calendar }))} />
          </QuickActionsButton>
        </TopNavBar>

        <CardWrapper visible={orgCardVis.stats}>
          <OrganiserOverviewHero />
        </CardWrapper>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {orgCardVis.pending && (
            <div className={orgCardVis.calendar ? "lg:col-span-3" : "lg:col-span-5"}>
              <OrganiserPendingMatches />
            </div>
          )}
          {orgCardVis.calendar && (
            <div className={orgCardVis.pending ? "lg:col-span-2" : "lg:col-span-5"}>
              <EventCalendar events={calendarEvents} highlightedDates={highlightedDates} />
            </div>
          )}
        </div>

        <DashboardNetwork />
      </div>
    );
  }

  // ═══════════════════════════════════════
  // DEFAULT FALLBACK
  // ═══════════════════════════════════════
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <EventCalendar events={calendarEvents} highlightedDates={highlightedDates} />
        </div>
        <div className="space-y-4">
          <div className="coach-card p-4">
            <h3 className="font-heading text-lg text-foreground mb-3">
              QUICK <span style={{ color: "#e8a020" }}>ACTIONS</span>
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="justify-start gap-2 h-10" asChild>
                <Link to="/explore?tab=events">
                  <Search className="h-4 w-4 text-primary" />
                  Browse Events
                </Link>
              </Button>
              <Button variant="outline" className="justify-start gap-2 h-10" onClick={() => onNavigateSection("actions")}>
                <Inbox className="h-4 w-4 text-primary" />
                View Actions
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
