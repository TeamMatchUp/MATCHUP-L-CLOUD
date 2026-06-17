import { Link } from "react-router-dom";

export function LandingFooter() {
  return (
    <footer className="lv2-footer">
      <div className="container">
        <div className="lv2-footer-grid">
          <div className="lv2-footer-brand">
            <Link to="/" className="lv2-logo">MATCH<span>UP</span></Link>
            <p>The professional matchmaking platform for combat sports.</p>
          </div>
          <div>
            <h5>Platform</h5>
            <Link to="/events">Events</Link>
            <Link to="/fighters">Fighters</Link>
            <Link to="/gyms">Gyms</Link>
          </div>
          <div>
            <h5>For Teams</h5>
            <Link to="/register-gym">Register Gym</Link>
            <Link to="/organiser/create-event">Create Event</Link>
          </div>
          <div>
            <h5>Legal</h5>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
        <div className="lv2-footer-copy">© 2026 MatchUp. All rights reserved.</div>
      </div>
    </footer>
  );
}
