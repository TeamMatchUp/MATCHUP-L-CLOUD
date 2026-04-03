import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { User } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";

export function ExploreNav() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[100] transition-all duration-300"
      style={{
        height: 56,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: scrolled ? "rgba(13,15,18,0.75)" : "#0d0f12",
        backdropFilter: scrolled ? "blur(16px) saturate(180%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(16px) saturate(180%)" : "none",
        boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.3)" : "none",
      }}
    >
      {/* Left — Logo */}
      <Link to="/" className="flex items-center gap-2">
        <AppLogo className="h-7" />
      </Link>

      {/* Centre — Nav links */}
      <div className="flex items-center gap-6">
        <Link
          to="/"
          className="text-sm transition-colors duration-150"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 14,
            color: isActive("/") ? "#e8eaf0" : "#8b909e",
          }}
        >
          Home
        </Link>
        <Link
          to="/explore"
          className="transition-colors duration-150"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 14,
            color: location.pathname.startsWith("/explore") ? "#e8eaf0" : "#8b909e",
            borderBottom: location.pathname.startsWith("/explore") ? "2px solid #e8a020" : "2px solid transparent",
            paddingBottom: 2,
          }}
        >
          Explore
        </Link>
      </div>

      {/* Right — Log In */}
      <Link
        to="/auth"
        className="flex items-center gap-2 transition-all duration-200"
        style={{
          border: "1px solid #e8a020",
          color: "#e8a020",
          borderRadius: 8,
          padding: "7px 18px",
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          boxShadow: scrolled ? "0 0 16px rgba(232,160,32,0.15)" : "none",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(232,160,32,0.08)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 16px rgba(232,160,32,0.2)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.boxShadow = scrolled ? "0 0 16px rgba(232,160,32,0.15)" : "none";
        }}
      >
        <User className="h-4 w-4" />
        Log In
      </Link>
    </nav>
  );
}
