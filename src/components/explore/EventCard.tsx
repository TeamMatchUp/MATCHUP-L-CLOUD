import { MapPin, Calendar, Clock, ChevronRight } from "lucide-react";

interface EventCardProps {
  event: any;
  index: number;
  onClick: () => void;
}

export function EventCard({ event, index, onClick }: EventCardProps) {
  const hasTickets = event.tickets && event.tickets.length > 0;
  const minPrice = hasTickets
    ? Math.min(...event.tickets.map((t: any) => t.price ?? Infinity).filter((p: number) => p !== Infinity))
    : null;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer group"
      style={{
        background: "#14171e",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        overflow: "hidden",
        transition: "border-color 0.2s, transform 0.15s, box-shadow 0.2s",
        willChange: "transform",
        animation: `fadeUp 0.35s cubic-bezier(0.25,0.46,0.45,0.94) ${Math.min(index * 50, 300)}ms forwards`,
        opacity: 0,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(232,160,32,0.25)";
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(232,160,32,0.1)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "rgba(255,255,255,0.06)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      {/* Hero */}
      <div style={{ width: "100%", height: 180, overflow: "hidden", position: "relative" }}>
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #1a1e28, #14171e)" }}
        >
          <Calendar className="h-12 w-12" style={{ color: "#555b6b" }} />
        </div>
        {/* Tickets badge */}
        {hasTickets && (
          <div
            className="absolute top-3 left-3"
            style={{
              background: "rgba(239,68,68,0.85)",
              color: "white",
              borderRadius: 9999,
              padding: "4px 10px",
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
            Tickets Available
          </div>
        )}
        {/* Price badge */}
        {minPrice != null && minPrice !== Infinity && (
          <div
            className="absolute top-3 right-3"
            style={{
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 9999,
              padding: "6px 12px",
              textAlign: "center",
            }}
          >
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 9, color: "#8b909e", display: "block" }}>From</span>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "#e8a020" }}>
              ${minPrice}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 16 }}>
        <h3
          className="transition-colors duration-150 group-hover:text-[#e8a020]"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18,
            color: "#e8eaf0",
            textTransform: "uppercase",
          }}
        >
          {event.title}
        </h3>
        {event.description && (
          <p className="line-clamp-2" style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#8b909e", marginTop: 4 }}>
            {event.description}
          </p>
        )}
        <div className="space-y-1.5" style={{ marginTop: 12 }}>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" style={{ color: "#8b909e" }} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8b909e" }}>
              {new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" style={{ color: "#8b909e" }} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8b909e" }}>
              {new Date(event.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          {(event.venue_name || event.location) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" style={{ color: "#8b909e" }} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8b909e" }}>
                {[event.venue_name, event.city].filter(Boolean).join(", ") || event.location}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <span
          className="group-hover:underline"
          style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#e8a020" }}
        >
          View Event
        </span>
        <div
          className="flex items-center justify-center transition-all duration-150 group-hover:translate-x-0.5"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "rgba(232,160,32,0.12)",
            border: "1px solid rgba(232,160,32,0.25)",
          }}
        >
          <ChevronRight className="h-4 w-4" style={{ color: "#e8a020" }} />
        </div>
      </div>
    </div>
  );
}
