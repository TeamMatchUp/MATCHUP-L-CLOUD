import { Link, useSearchParams } from "react-router-dom";
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
          { label: "Create Gym", icon: Building2, to: "/register-gym" },
          { label: "Add Fighter", icon: Plus, section: "roster" },
        ]
      : []),
    { label: "View Proposals", icon: Inbox, section: "proposals" },
    ...(isOrganiser || isCoachOrOwner
      ? [{ label: "Create Event", icon: Calendar, to: "/organiser/create-event" }]
      : []),
    { label: "Browse Events", icon: Search, to: "/events" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m) => (
          <button
            key={m.label}
            onClick={() => m.section && onNavigateSection(m.section)}
            className={`rounded-lg border border-border bg-card p-4 text-left transition-colors ${
              m.section ? "hover:border-primary/30 cursor-pointer" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {m.label}
              </p>
              {m.section && (
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
            <p className="font-heading text-3xl text-foreground tabular-nums">
              {m.value}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">{m.sub}</p>
          </button>
        ))}
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
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-heading text-lg text-foreground mb-3">
              QUICK <span className="text-primary">ACTIONS</span>
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {quickActions.map((action) =>
                action.to ? (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="justify-start gap-2 h-10"
                    asChild
                  >
                    <Link to={action.to}>
                      <action.icon className="h-4 w-4 text-primary" />
                      {action.label}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="justify-start gap-2 h-10"
                    onClick={() => action.section && onNavigateSection(action.section)}
                  >
                    <action.icon className="h-4 w-4 text-primary" />
                    {action.label}
                  </Button>
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
