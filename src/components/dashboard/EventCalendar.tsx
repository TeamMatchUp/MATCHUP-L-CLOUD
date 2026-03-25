import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

interface EventCalendarProps {
  events: { id: string; title: string; date: string; location: string; status?: string }[];
}

export function EventCalendar({ events }: EventCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const eventDateSet = new Set(events.map((e) => e.date));

  const selectedDateStr = date ? format(date, "yyyy-MM-dd") : "";
  const eventsOnDate = events.filter((e) => e.date === selectedDateStr);

  // Upcoming events (next 5)
  const today = format(new Date(), "yyyy-MM-dd");
  const upcomingEvents = events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-heading text-lg text-foreground mb-3">
        EVENTS <span className="text-primary">CALENDAR</span>
      </h3>
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className={cn("p-3 pointer-events-auto w-full")}
        modifiers={{
          event: (day) => eventDateSet.has(format(day, "yyyy-MM-dd")),
        }}
        modifiersClassNames={{
          event: "bg-primary/20 text-primary font-semibold",
        }}
      />

      <div className="mt-3 pt-3 border-t border-border space-y-2">
        {eventsOnDate.length > 0 ? (
          <>
            <p className="text-xs text-muted-foreground font-medium uppercase">
              Events on {format(date!, "MMM d, yyyy")}
            </p>
            {eventsOnDate.map((e) => (
              <Link
                key={e.id}
                to={`/events/${e.id}`}
                className="block p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <p className="text-sm font-medium text-foreground">{e.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {e.location}
                </p>
              </Link>
            ))}
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground font-medium uppercase">
              No events on {date ? format(date, "MMM d, yyyy") : "—"}
            </p>
            {upcomingEvents.length > 0 && (
              <>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-2">Next upcoming</p>
                {upcomingEvents.map((e) => (
                  <Link
                    key={e.id}
                    to={`/events/${e.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{e.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {e.location}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {format(new Date(e.date + "T00:00:00"), "MMM d")}
                    </span>
                  </Link>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
