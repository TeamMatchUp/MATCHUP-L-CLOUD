import { Link } from "react-router-dom";
import { ConstellationCanvas } from "./ConstellationCanvas";

export function HeroSection() {
  const scrollToHow = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="lv2-hero">
      <div className="lv2-hero-canvas-wrap">
        <ConstellationCanvas />
      </div>
      <div className="lv2-hero-fade" />
      <div className="lv2-hero-content">
        <span className="lv2-badge">
          <span className="lv2-badge-dot" />
          Smart Matchmaking for Combat Sports
        </span>
        <h1 className="lv2-hero-title">
          <span className="lv2-hero-title-line l1"><span>The right match.</span></span>
          <span className="lv2-hero-title-line l2"><span>Every time.</span></span>
        </h1>
        <p className="lv2-hero-sub">
          Combat sports still run on WhatsApp groups and spreadsheets. We built the infrastructure it actually deserves.
        </p>
        <div className="lv2-hero-cta">
          <Link to="/auth?mode=signup" className="btn-gold">Start Matching</Link>
          <a href="#how-it-works" onClick={scrollToHow} className="btn-ghost">See how it works</a>
        </div>
        <div className="lv2-hero-caption">Every fight starts here</div>
      </div>
    </section>
  );
}
