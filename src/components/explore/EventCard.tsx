import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { HazePlaceholder } from "@/components/HazePlaceholder";
import { isEventBoosted } from "@/hooks/useActiveBoost";

interface Props {
  event: any;
  index?: number;
  className?: string;
}

/**
 * Shared Explore event card.
 * - Fixed height, no avatar, boosted pill top-right
 * - Cover image band, day/month gold block, compact info
 * - Used in Explore grid AND Interests page (single source of truth)
 */
export function EventCard({ event, index = 0, className }: Props) {
  const dt = new Date(event.date);
  const day = dt.getDate();
  const month = dt.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
  const timeStr = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const venue = event.venue_name || event.location || event.city || "";
  const boosted = isEventBoosted(event.event_boosts);

  const now = new Date();
  const activeTickets = (event.tickets ?? []).filter(
    (t: any) =>
      (!t.sales_start || new Date(t.sales_start) <= now) &&
      (!t.sales_end || new Date(t.sales_end) >= now)
  );
  const isSoldOut = event.sold_out === true || (event.ticket_enabled && activeTickets.length === 0 && (event.tickets?.length ?? 0) > 0);
  const minPrice = activeTickets.length
    ? Math.min(...activeTickets.map((t: any) => Number(t.price) || 0).filter((n: number) => n >= 0))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.2) }}
      className={className}
    >
      <Link
        to={`/events/${event.id}`}
        className="mu-card block group relative"
        style={{ height: 232, display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {/* Cover strip */}
        <div style={{ position: "relative", height: 76, flexShrink: 0, overflow: "hidden" }}>
          {event.banner_image ? (
            <img src={event.banner_image} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <HazePlaceholder className="absolute inset-0" />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, hsl(var(--card)) 100%)",
            }}
          />
          {boosted && (
            <span
              className="glass-badge"
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                borderRadius: 999,
                padding: "3px 8px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "hsl(var(--primary))",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                textTransform: "uppercase",
              }}
            >
              <Sparkles style={{ width: 10, height: 10 }} /> Boosted
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "10px 14px 12px", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div
              style={{
                flexShrink: 0,
                textAlign: "center",
                fontFamily: "'Bebas Neue', sans-serif",
                color: "hsl(var(--primary))",
                lineHeight: 1,
                minWidth: 40,
              }}
            >
              <div style={{ fontSize: 28 }}>{day}</div>
              <div style={{ fontSize: 11, letterSpacing: "0.1em", marginTop: 2 }}>{month}</div>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                title={event.title}
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: "hsl(var(--foreground))",
                  lineHeight: 1.25,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {event.title}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "hsl(var(--muted-foreground))",
                  marginTop: 4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {venue} · {timeStr}
              </p>
            </div>
          </div>

          {event.description && (
            <p
              style={{
                fontSize: 12,
                color: "hsl(var(--muted-foreground))",
                marginTop: 8,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                lineHeight: 1.4,
              }}
            >
              {event.description}
            </p>
          )}

          <div style={{ marginTop: "auto", paddingTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            {event.discipline ? (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "hsl(var(--muted))",
                  color: "hsl(var(--foreground))",
                  textTransform: "capitalize",
                }}
              >
                {String(event.discipline).replace(/_/g, " ")}
              </span>
            ) : <span />}
            {isSoldOut ? (
              <span style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--destructive))", letterSpacing: "0.06em" }}>
                SOLD OUT
              </span>
            ) : minPrice !== null ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: "hsl(var(--foreground))" }}>
                From £{minPrice.toFixed(minPrice % 1 === 0 ? 0 : 2)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
