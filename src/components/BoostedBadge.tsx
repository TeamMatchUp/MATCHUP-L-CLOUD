import { Sparkles } from "lucide-react";

export function BoostedBadge({ size = "sm", style }: { size?: "sm" | "md"; style?: React.CSSProperties }) {
  const fs = size === "md" ? 12 : 10;
  const iconSize = size === "md" ? 12 : 10;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "rgba(239,68,68,0.12)",
        color: "#e8a020",
        fontFamily: "'Bebas Neue', sans-serif",
        letterSpacing: "0.08em",
        fontSize: fs,
        padding: size === "md" ? "4px 10px" : "3px 8px",
        borderRadius: 999,
        textTransform: "uppercase",
        ...style,
      }}
    >
      <Sparkles style={{ width: iconSize, height: iconSize }} />
      Boosted
    </span>
  );
}
