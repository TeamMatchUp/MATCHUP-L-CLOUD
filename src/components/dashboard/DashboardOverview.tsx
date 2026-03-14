import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EventCalendar } from "./EventCalendar";
import { ActivityFeed } from "./ActivityFeed";
import {
  Building2,
  Users,
  Inbox,
  Calendar,
  Bell,
  Check,
  Plus,
  Search,
  ArrowUpRight,
} from "lucide-react";

interface Metric {
  label: string;
  value: number;
  sub: string;
  icon: any;
  section?: string;
}

interface DashboardOverviewProps {
  metrics: Metric[];
  calendarEvents: any[];
  notifications: any[];
  effectiveRoles: string[];
  onNavigateSection: (section: string) => void;
}

export function DashboardOverview({
  metrics,
  calendarEvents,
  notifications,
  effectiveRoles,
  onNavigateSection,
}: DashboardOverviewProps) {
  const isCoachOrOwner =
    effectiveRoles.includes("gym_owner") || effectiveRoles.includes("coach");
  const isOrganiser = effectiveRoles.includes("organiser");

  const quickActions = [
    ...(isCoachOrOwner
      ? [
          { label: "Create gym", icon: Building2, to: "/register-gym" },
          { label: "Add fighter", icon: Plus, section: "roster" },
        ]
      : []),
    { label: "View proposals", icon: Inbox, section: "proposals" },
    ...(isOrganiser || isCoachOrOwner
      ? [{ label: "Create event", icon: Calendar, to: "/organiser/create-event" }]
      : []),
    { label: "Browse events", icon: Search, to: "/events" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {metrics.map((m) => {
          const isZero = m.value === 0;
          const isConfirmed = m.label === "Confirmed";
          return (
            <button
              key={m.label}
              onClick={() => m.section && onNavigateSection(m.section)}
              className={`mu-card p-4 text-left transition-colors duration-150 ${
                m.section ? "hover:border-[var(--mu-gold-b)] cursor-pointer" : ""
              } ${isZero ? "opacity-[0.42]" : ""} ${
                isConfirmed && !isZero ? "border-[var(--mu-gold-b)]" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="mu-section-label mb-0">
                  {m.label}
                </p>
                {m.section && (
                  <ArrowUpRight className="h-3.5 w-3.5 text-[var(--mu-t3)]" />
                )}
              </div>
              <p className={`font-heading text-3xl tabular-nums ${
                isConfirmed && !isZero ? "text-[var(--mu-gold)]" : "text-[var(--mu-t1)]"
              }`}>
                {m.value}
              </p>
              <p className="text-[11px] text-[var(--mu-t3)] mt-1">{m.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Calendar + Quick Actions + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <EventCalendar events={calendarEvents} />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="mu-card p-4">
            <h3 className="text-[var(--mu-t1)] text-sm font-medium mb-3">
              Quick <span className="text-[var(--mu-gold)]">actions</span>
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {quickActions.map((action) =>
                action.to ? (
                  <Link
                    key={action.label}
                    to={action.to}
                    className="mu-btn-ghost flex items-center gap-2 text-left"
                  >
                    <action.icon className="h-4 w-4 text-[var(--mu-gold)]" />
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={action.label}
                    className="mu-btn-ghost flex items-center gap-2 text-left w-full"
                    onClick={() => action.section && onNavigateSection(action.section)}
                  >
                    <action.icon className="h-4 w-4 text-[var(--mu-gold)]" />
                    {action.label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <ActivityFeed notifications={notifications} />
        </div>
      </div>
    </div>
  );
}
