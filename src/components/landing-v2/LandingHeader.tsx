import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="lv2-header" data-scrolled={scrolled}>
        <div className="lv2-header-inner">
          <Link to="/" className="lv2-logo" aria-label="MATCHUP home">
            MATCH<span>UP</span>
          </Link>
          <div className="lv2-header-actions">
            <Link to="/auth" className="lv2-login">Log In</Link>
            <Link to="/auth?mode=signup" className="btn-gold">Get Started</Link>
            <button
              type="button"
              className="lv2-hamburger"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>
      {open && (
        <div className="lv2-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="lv2-overlay-close"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X size={28} />
          </button>
          <Link to="/auth" className="lv2-login" onClick={() => setOpen(false)}>Log In</Link>
          <Link to="/auth?mode=signup" className="btn-gold" onClick={() => setOpen(false)}>Get Started</Link>
        </div>
      )}
    </>
  );
}
