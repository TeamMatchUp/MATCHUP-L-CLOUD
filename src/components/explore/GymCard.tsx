import { MapPin, Users, ChevronRight, Calendar } from "lucide-react";

interface GymCardProps {
  gym: any;
  index: number;
  onClick: () => void;
}

export function GymCard({ gym, index, onClick }: GymCardProps) {
  const fighterCount = gym.fighter_gym_links?.length ?? 0;
  const tags = gym.discipline_tags ? gym.discipline_tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

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
      {/* Hero image */}
      <div style={{ width: "100%", height: 180, overflow: "hidden", position: "relative" }}>
        {gym.logo_url ? (
          <img
            src={gym.logo_url}
            alt={gym.name}
            className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "#1a1e28" }}
          >
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: "#555b6b" }}>
              {gym.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </span>
          </div>
        )}
        {/* Discipline tags overlay */}
        {tags.length > 0 && (
          <div className="absolute bottom-2.5 left-2.5 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                style={{
                  background: "rgba(0,0,0,0.6)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(232,160,32,0.25)",
                  color: "#e8a020",
                  borderRadius: 9999,
                  padding: "3px 10px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 16 }}>
        <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 16, color: "#e8eaf0" }}>
          {gym.name}
        </h3>
        {gym.description && (
          <p className="line-clamp-2" style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#8b909e", marginTop: 4 }}>
            {gym.description}
          </p>
        )}
        <div style={{ marginTop: 12 }} className="space-y-1.5">
          {(gym.city || gym.location) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" style={{ color: "#8b909e" }} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8b909e" }}>
                {gym.city ? `${gym.city}, ${gym.country}` : gym.location}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5" style={{ color: "#8b909e" }} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8b909e" }}>
              {fighterCount} fighter{fighterCount !== 1 ? "s" : ""}
            </span>
          </div>
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
          View Details
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
