import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EventCalendar } from "./EventCalendar";
import {
  Building2,
  Plus,
  Search,
  Calendar,
  Inbox,
} from "lucide-react";

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

  const quickActions = [
    ...(isCoachOrOwner
      ? [
          { label: "Create Gym", icon: Building2, to: "/register-gym" },
          { label: "Add Fighter", icon: Plus, section: "roster" },
        ]
      : []),
    { label: "View Actions", icon: Inbox, section: "actions" },
    ...(isOrganiser || isCoachOrOwner
      ? [{ label: "Create Event", icon: Calendar, to: "/organiser/create-event" }]
      : []),
    { label: "Browse Events", icon: Search, to: "/explore?tab=events" },
  ];

  return (
    <div className="space-y-6">
      {/* Calendar + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <EventCalendar events={calendarEvents} />
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
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

          {/* Ad placeholder */}
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-card flex items-center justify-center" style={{ height: 250 }}>
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-heading">Advertisement</span>
          </div>
        </div>
      </div>
    </div>
  );
}
