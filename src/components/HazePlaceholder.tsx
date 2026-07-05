interface Props {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Gold + red haze gradient placeholder used across Explore card banners
 * when the entity has no uploaded cover image.
 */
export function HazePlaceholder({ className, style }: Props) {
  return (
    <div
      className={className}
      style={{
        background:
          "radial-gradient(120% 90% at 15% 20%, rgba(232,160,32,0.55) 0%, rgba(232,160,32,0) 55%), radial-gradient(110% 90% at 85% 80%, rgba(239,68,68,0.45) 0%, rgba(239,68,68,0) 60%), radial-gradient(80% 60% at 60% 40%, rgba(232,160,32,0.18) 0%, rgba(0,0,0,0) 70%), linear-gradient(135deg, #14100b 0%, #0c0a0d 60%, #0a0608 100%)",
        filter: "saturate(115%)",
        ...style,
      }}
    />
  );
}
