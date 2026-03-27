import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, setYear, getYear } from "date-fns";
import { Link } from "react-router-dom";
import { MapPin, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventCalendarProps {
  events: { id: string; title: string; date: string; location: string; status?: string }[];
  highlightedDates?: string[];
}

export function EventCalendar({ events, highlightedDates = [] }: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const highlightedSet = useMemo(() => new Set(highlightedDates), [highlightedDates]);

  const eventCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    events.forEach((e) => {
      map[e.date] = (map[e.date] || 0) + 1;
    });
    return map;
  }, [events]);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const eventsOnDate = events.filter((e) => e.date === selectedDateStr);

  const today = format(new Date(), "yyyy-MM-dd");
  const upcomingEvents = events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg text-foreground">
          EVENTS <span className="text-primary">CALENDAR</span>
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-foreground min-w-[120px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-[10px] uppercase tracking-widest text-muted-foreground py-1 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const dateStr = format(d, "yyyy-MM-dd");
          const count = eventCountByDate[dateStr] || 0;
          const inMonth = isSameMonth(d, currentMonth);
          const selected = isSameDay(d, selectedDate);
          const isNow = isToday(d);

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(d)}
              className={cn(
                "relative flex flex-col items-center justify-start rounded-md p-1.5 min-h-[52px] transition-colors text-sm",
                !inMonth && "opacity-30",
                selected && "bg-primary/10 border border-primary/30",
                !selected && "hover:bg-muted/50",
                isNow && !selected && "border border-border"
              )}
            >
              <span className={cn(
                "font-medium",
                selected ? "text-primary" : "text-foreground",
                isNow && !selected && "text-primary"
              )}>
                {format(d, "d")}
              </span>
              {count > 0 && (
                <span className="mt-0.5 text-[9px] font-medium bg-primary/20 text-primary rounded-full px-1.5 py-0.5 leading-none">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Events panel below */}
      <div className="mt-4 pt-4 border-t border-border space-y-2">
        {eventsOnDate.length > 0 ? (
          <>
            <p className="text-xs text-muted-foreground font-medium uppercase">
              Events on {format(selectedDate, "MMM d, yyyy")}
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
              No events on {format(selectedDate, "MMM d, yyyy")}
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
