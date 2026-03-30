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
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { CoachKpiStrip } from "./CoachKpiStrip";
import { CoachUpcomingFights } from "./CoachUpcomingFights";
import { FighterRecordHero } from "./FighterRecordHero";
import { FighterNextFight } from "./FighterNextFight";

interface DashboardOverviewProps {
  calendarEvents: any[];
  highlightedDates?: string[];
  effectiveRoles: string[];
  onNavigateSection: (section: string) => void;
}

export function DashboardOverview({
  calendarEvents,
  highlightedDates = [],
  effectiveRoles,
  onNavigateSection,
}: DashboardOverviewProps) {
  const isCoachOrOwner =
    effectiveRoles.includes("gym_owner") || effectiveRoles.includes("coach");
  const isOrganiser = effectiveRoles.includes("organiser");
  const isFighter = effectiveRoles.includes("fighter");

  const [showQuickActions, setShowQuickActions] = useState(false);

  // Fighter card visibility
  const [fighterCardVis, setFighterCardVis] = useState({
    record: true,
    nextFight: true,
    calendar: true,
  });

  // Coach card visibility
  const [coachCardVis, setCoachCardVis] = useState({
    kpis: true,
    fights: true,
    calendar: true,
  });

  const toggleFighterVis = (card: keyof typeof fighterCardVis) => {
    setFighterCardVis((prev) => ({ ...prev, [card]: !prev[card] }));
  };

  const toggleCoachVis = (card: keyof typeof coachCardVis) => {
    setCoachCardVis((prev) => ({ ...prev, [card]: !prev[card] }));
  };

  // Quick Actions dropdown content
  const QuickActionsDropdown = ({ children }: { children: React.ReactNode }) => (
    <div className="relative">
      <Button
        variant="outline"
        className="border-primary text-primary hover:bg-primary/5 gap-2 text-[13px] font-semibold h-9 px-4"
        onClick={() => setShowQuickActions(!showQuickActions)}
      >
        <Plus className="h-4 w-4" />
        Quick Actions
        <ChevronDown className="h-3 w-3" />
      </Button>

      {showQuickActions && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowQuickActions(false)} />
          <div
            className="absolute right-0 top-11 z-50 min-w-[220px] rounded-xl border bg-accent/95 backdrop-blur-sm shadow-xl p-2"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );

  // ═══════════════════════════════════════
  // FIGHTER OVERVIEW
  // ═══════════════════════════════════════
  if (isFighter && !isCoachOrOwner) {
    const fighterActions = [
      { label: "Edit Profile", icon: User, section: "my-profile" },
      { label: "Set Availability", icon: ToggleRight, section: "my-profile" },
      { label: "Find Opponents", icon: Crosshair, to: "/explore?tab=fighters" },
    ];

    const fighterVisItems = [
      { key: "record" as const, label: "Fight Record Card" },
      { key: "nextFight" as const, label: "Next Fight Card" },
      { key: "calendar" as const, label: "Calendar Card" },
    ];

    return (
      <div className="space-y-4">
        {/* Top Nav Bar */}
        <div className="flex items-center justify-between h-14 -mt-2 mb-2">
          <div className="flex items-center gap-2">
            <AppLogo className="h-6" />
          </div>
          <QuickActionsDropdown>
            {fighterActions.map((action) =>
              action.to ? (
                <Link
                  key={action.label}
                  to={action.to}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors"
                  onClick={() => setShowQuickActions(false)}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Link>
              ) : (
                <button
                  key={action.label}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors"
                  onClick={() => {
                    setShowQuickActions(false);
                    action.section && onNavigateSection(action.section);
                  }}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </button>
              )
            )}
            <div className="border-t border-border my-1.5" />
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              KPI Visibility
            </p>
            {fighterVisItems.map((item) => (
              <button
                key={item.key}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors"
                onClick={() => toggleFighterVis(item.key)}
              >
                {item.label}
                {fighterCardVis[item.key] ? (
                  <Eye className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </button>
            ))}
          </QuickActionsDropdown>
        </div>

        {/* Fight Record Hero */}
        <div
          className="transition-all duration-300 overflow-hidden"
          style={{
            opacity: fighterCardVis.record ? 1 : 0,
            maxHeight: fighterCardVis.record ? "600px" : "0px",
          }}
        >
          {fighterCardVis.record && <FighterRecordHero />}
        </div>

        {/* Lower two-column: Next Fight + Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div
            className="lg:col-span-3 transition-all duration-300"
            style={{
              opacity: fighterCardVis.nextFight ? 1 : 0,
              maxHeight: fighterCardVis.nextFight ? "2000px" : "0px",
              overflow: "hidden",
            }}
          >
            {fighterCardVis.nextFight && <FighterNextFight />}
          </div>

          <div
            className="lg:col-span-2 transition-all duration-300"
            style={{
              opacity: fighterCardVis.calendar ? 1 : 0,
              maxHeight: fighterCardVis.calendar ? "2000px" : "0px",
              overflow: "hidden",
            }}
          >
            {fighterCardVis.calendar && (
              <EventCalendar events={calendarEvents} highlightedDates={highlightedDates} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // COACH / GYM OWNER OVERVIEW
  // ═══════════════════════════════════════
  if (isCoachOrOwner) {
    const coachActions = [
      { label: "Create Gym", icon: Building2, to: "/register-gym?from=overview" },
      { label: "Create Event", icon: Calendar, to: "/organiser/create-event?from=overview" },
      { label: "Add Fighter", icon: Plus, section: "roster" },
    ];

    const coachVisItems = [
      { key: "kpis" as const, label: "KPIs Card" },
      { key: "fights" as const, label: "Fights Card" },
      { key: "calendar" as const, label: "Calendar Card" },
    ];

    return (
      <div className="space-y-4">
        {/* Top Nav Bar */}
        <div className="flex items-center justify-between h-14 -mt-2 mb-2">
          <div className="flex items-center gap-2">
            <AppLogo className="h-6" />
          </div>
          <QuickActionsDropdown>
            {coachActions.map((action) =>
              action.to ? (
                <Link
                  key={action.label}
                  to={action.to}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors"
                  onClick={() => setShowQuickActions(false)}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Link>
              ) : (
                <button
                  key={action.label}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors"
                  onClick={() => {
                    setShowQuickActions(false);
                    action.section && onNavigateSection(action.section);
                  }}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </button>
              )
            )}
            <div className="border-t border-border my-1.5" />
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              KPI Visibility
            </p>
            {coachVisItems.map((item) => (
              <button
                key={item.key}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors"
                onClick={() => toggleCoachVis(item.key)}
              >
                {item.label}
                {coachCardVis[item.key] ? (
                  <Eye className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </button>
            ))}
          </QuickActionsDropdown>
        </div>

        {/* KPI Hero Strip */}
        <div
          className="transition-all duration-300 overflow-hidden"
          style={{
            opacity: coachCardVis.kpis ? 1 : 0,
            maxHeight: coachCardVis.kpis ? "400px" : "0px",
          }}
        >
          {coachCardVis.kpis && <CoachKpiStrip />}
        </div>

        {/* Lower two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div
            className="lg:col-span-3 transition-all duration-300"
            style={{
              opacity: coachCardVis.fights ? 1 : 0,
              maxHeight: coachCardVis.fights ? "2000px" : "0px",
              overflow: "hidden",
            }}
          >
            {coachCardVis.fights && <CoachUpcomingFights />}
          </div>

          <div
            className="lg:col-span-2 transition-all duration-300"
            style={{
              opacity: coachCardVis.calendar ? 1 : 0,
              maxHeight: coachCardVis.calendar ? "2000px" : "0px",
              overflow: "hidden",
            }}
          >
            {coachCardVis.calendar && (
              <EventCalendar events={calendarEvents} highlightedDates={highlightedDates} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // DEFAULT / ORGANISER FALLBACK
  // ═══════════════════════════════════════
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <EventCalendar events={calendarEvents} highlightedDates={highlightedDates} />
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-heading text-lg text-foreground mb-3">
              QUICK <span className="text-primary">ACTIONS</span>
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="justify-start gap-2 h-10" asChild>
                <Link to="/explore?tab=events">
                  <Search className="h-4 w-4 text-primary" />
                  Browse Events
                </Link>
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 h-10"
                onClick={() => onNavigateSection("actions")}
              >
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
