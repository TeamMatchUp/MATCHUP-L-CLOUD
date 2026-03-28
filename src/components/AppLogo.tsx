import { useTheme } from "next-themes";
import logoLight from "@/assets/logo-full-black.svg";
import logoDark from "@/assets/logo-full-white.svg";

interface AppLogoProps {
  className?: string;
  alt?: string;
}

export function AppLogo({ className = "h-10", alt = "MatchUp" }: AppLogoProps) {
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === "dark" ? logoDark : logoLight;

  return <img src={src} alt={alt} className={className} />;
}
