import { Megaphone, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  adImageUrl?: string;
  adLinkUrl?: string;
}

export function ExploreBanner({ adImageUrl, adLinkUrl }: Props) {
  if (adImageUrl && adLinkUrl) {
    return (
      <a
        href={adLinkUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          gridColumn: "1 / -1",
          width: "100%",
          height: 100,
          borderRadius: 12,
          overflow: "hidden",
          margin: "4px 0",
          display: "block",
        }}
      >
        <img src={adImageUrl} alt="Advertisement" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </a>
    );
  }

  return (
    <div
      style={{
        gridColumn: "1 / -1",
        width: "100%",
        height: 100,
        borderRadius: 12,
        overflow: "hidden",
        margin: "4px 0",
        background: "#111318",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Megaphone style={{ width: 20, height: 20, color: "#555b6b" }} />
        <div>
          <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#8b909e" }}>
            Advertise here
          </p>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#555b6b" }}>
            Reach combat sports athletes, coaches and event organisers
          </p>
        </div>
      </div>
      <Link
        to="/advertise"
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          fontFamily: "Inter, sans-serif",
          fontWeight: 600,
          fontSize: 12,
          color: "#e8a020",
          background: "transparent",
          border: "1px solid rgba(232,160,32,0.3)",
          cursor: "pointer",
          textDecoration: "none",
          whiteSpace: "nowrap",
          transition: "all 0.15s",
        }}
      >
        Request Ad Space
      </Link>
    </div>
  );
}
