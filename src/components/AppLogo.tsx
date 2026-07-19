import shieldAsset from "@/assets/mu-shield.png.asset.json";

interface AppLogoProps {
  className?: string;
  alt?: string;
}

export function AppLogo({ className = "h-10", alt = "MatchUp" }: AppLogoProps) {
  return <img src={shieldAsset.url} alt={alt} className={className} />;
}
