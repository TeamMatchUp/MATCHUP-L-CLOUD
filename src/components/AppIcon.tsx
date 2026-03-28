import { useTheme } from "next-themes";
import iconLight from "@/assets/icon-black.svg";
import iconDark from "@/assets/icon-white.svg";

interface AppIconProps {
  className?: string;
  alt?: string;
}

export function AppIcon({ className = "h-5 w-5", alt = "" }: AppIconProps) {
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === "dark" ? iconDark : iconLight;

  return <img src={src} alt={alt} className={className} />;
}
