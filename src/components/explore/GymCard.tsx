import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, ShieldCheck, Users } from "lucide-react";
import { HazePlaceholder } from "@/components/HazePlaceholder";

interface Props {
  gym: any;
  index?: number;
}

/**
 * Shared Explore gym card.
 * - Fixed height, no avatar, verified pill top-right
 * - Cover strip, name, city, fighter count, description clamp-2, discipline pills
 */
export function GymCard({ gym, index = 0 }: Props) {
  const loc = gym.city
    ? `${gym.city}${gym.country ? `, ${gym.country}` : ""}`
    : gym.location || gym.country || "";
  const fighterCount = gym.fighter_gym_links?.length ?? 0;
  const disciplines: string[] = Array.isArray(gym.discipline_tags) ? gym.discipline_tags.slice(0, 4) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.2) }}
    >
      <Link
        to={`/gyms/${gym.id}`}
        className="mu-card block group relative"
        style={{ height: 232, display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <div style={{ position: "relative", height: 76, flexShrink: 0, overflow: "hidden" }}>
          {gym.banner_image ? (
            <img src={gym.banner_image} alt={gym.name} className="w-full h-full object-cover" />
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
          {gym.claimed && (
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
                letterSpacing: "0.06em",
                color: "hsl(var(--primary))",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                textTransform: "uppercase",
              }}
            >
              <ShieldCheck style={{ width: 10, height: 10 }} /> Verified
            </span>
          )}
        </div>

        <div style={{ padding: "10px 14px 12px", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <p
            title={gym.name}
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "hsl(var(--foreground))",
              lineHeight: 1.25,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {gym.name}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
              <MapPin style={{ width: 11, height: 11, flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{loc || "—"}</span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <Users style={{ width: 11, height: 11 }} /> {fighterCount}
            </span>
          </div>

          {gym.description && (
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
              {gym.description}
            </p>
          )}

          {disciplines.length > 0 && (
            <div style={{ marginTop: "auto", paddingTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {disciplines.map((d) => (
                <span
                  key={d}
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    padding: "2px 7px",
                    borderRadius: 999,
                    background: "hsl(var(--muted))",
                    color: "hsl(var(--foreground))",
                    textTransform: "capitalize",
                    letterSpacing: "0.03em",
                  }}
                >
                  {String(d).replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
