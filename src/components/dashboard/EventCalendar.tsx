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
    <div className="mu-card p-4">
      <h3 className="text-[var(--mu-t1)] text-sm font-medium mb-3">
        Events <span className="text-[var(--mu-gold)]">calendar</span>
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
          event: "bg-[var(--mu-gold)] text-[#111] font-medium rounded-lg",
        }}
      />

      {eventsOnDate.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--mu-border)] space-y-2">
          <p className="mu-section-label">
            Events on {format(date!, "MMM d, yyyy")}
          </p>
          {eventsOnDate.map((e) => (
            <Link
              key={e.id}
              to={`/events/${e.id}`}
              className="block p-2 rounded-mu-sm hover:bg-white/[0.04] transition-colors duration-150"
            >
              <p className="text-sm font-medium text-[var(--mu-t1)]">{e.title}</p>
              <p className="text-xs text-[var(--mu-t3)] flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {e.location}
              </p>
            </Link>
          ))}
        </div>
      )}

      {eventsOnDate.length === 0 && upcomingEvents.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--mu-border)] space-y-2">
          <p className="mu-section-label">
            Upcoming events
          </p>
          {upcomingEvents.map((e) => (
            <Link
              key={e.id}
              to={`/events/${e.id}`}
              className="flex items-center justify-between p-2 rounded-mu-sm hover:bg-white/[0.04] transition-colors duration-150"
            >
              <div>
                <p className="text-sm font-medium text-[var(--mu-t1)]">{e.title}</p>
                <p className="text-xs text-[var(--mu-t3)] flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {e.location}
                </p>
              </div>
              <span className="text-xs text-[var(--mu-t3)] whitespace-nowrap ml-2">
                {format(new Date(e.date + "T00:00:00"), "MMM d")}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
