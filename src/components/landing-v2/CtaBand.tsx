import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export function CtaBand() {
  const ref = useScrollReveal();
  return (
    <section className="lv2-section">
      <div className="container">
        <div className="lv2-cta reveal" ref={ref}>
          <div className="lv2-cta-inner">
            <h2>
              Every fight starts <span className="muted">here.</span>
            </h2>
            <p>MatchUp connects the right people, at the right time.</p>
            <Link to="/auth?mode=signup" className="btn-gold">Create Your Free Account</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
