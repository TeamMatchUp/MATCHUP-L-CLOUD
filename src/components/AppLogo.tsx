import logoAsset from "@/assets/mu-logo.png.asset.json";

interface AppLogoProps {
  className?: string;
  alt?: string;
}

export function AppLogo({ className = "h-10 w-auto", alt = "MatchUp" }: AppLogoProps) {
  return <img src={logoAsset.url} alt={alt} className={className} />;
}
