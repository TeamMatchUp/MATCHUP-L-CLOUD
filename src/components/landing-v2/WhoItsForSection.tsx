import { useState } from "react";
import { User, Users, Building2, Trophy, ShieldCheck, Target, Zap, BarChart3, CheckCircle2, MapPin, Award, Eye, Layers, Ticket } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

type TabKey = "fighters" | "coaches" | "gyms" | "promoters";

interface TabContent {
  key: TabKey;
  label: string;
  Icon: typeof User;
  heading: string;
  description: string;
  features: { Icon: typeof User; title: string; desc: string }[];
}

const TABS: TabContent[] = [
  {
    key: "fighters",
    label: "Fighters",
    Icon: User,
    heading: "Fighters",
    description: "Find the right opponents. Build your legacy. Every match is scored for competitiveness so you step in the ring knowing it's a fair fight.",
    features: [
      { Icon: ShieldCheck, title: "Verified Records", desc: "Trusted fight history, no guesswork." },
      { Icon: Target, title: "Smart Matching", desc: "Opponents scored on skill, style and weight." },
      { Icon: Zap, title: "One-Tap Accept", desc: "Review and confirm bouts in seconds." },
    ],
  },
  {
    key: "coaches",
    label: "Coaches",
    Icon: Users,
    heading: "Coaches",
    description: "Discover talent. Connect. Grow your team. Manage your whole roster's fight history and proposals from one dashboard.",
    features: [
      { Icon: Users, title: "Roster Management", desc: "Track every fighter under your gym." },
      { Icon: BarChart3, title: "Performance Analytics", desc: "Win rates, finish rates, trends." },
      { Icon: CheckCircle2, title: "Proposal Approval", desc: "Sign off on bouts for your fighters." },
    ],
  },
  {
    key: "gyms",
    label: "Gyms",
    Icon: Building2,
    heading: "Gyms",
    description: "Increase visibility. Attract members. Build your brand. Get listed in the directory fighters and coaches actually search.",
    features: [
      { Icon: MapPin, title: "Public Directory Listing", desc: "Discoverable by fighters near you." },
      { Icon: Award, title: "Verified Badge", desc: "Build trust with a verified gym profile." },
      { Icon: Eye, title: "Lead Insights", desc: "See who's interested in your gym." },
    ],
  },
  {
    key: "promoters",
    label: "Promoters",
    Icon: Trophy,
    heading: "Promoters",
    description: "Build better cards. Find the right fights. Save time. Fill an entire event card with scored, balanced matchups in minutes.",
    features: [
      { Icon: Target, title: "Smart Suggestions", desc: "Get scored matchups for every slot." },
      { Icon: Layers, title: "Full Card Management", desc: "Build, edit and publish in one place." },
      { Icon: Ticket, title: "Ticketing Built In", desc: "Sell tickets straight from your event page." },
    ],
  },
];

export function WhoItsForSection() {
  const [active, setActive] = useState<TabKey>("fighters");
  const headRef = useScrollReveal();
  const panelRef = useScrollReveal();
  const current = TABS.find((t) => t.key === active)!;
  const { Icon } = current;

  return (
    <section className="lv2-section">
      <div className="container">
        <div className="lv2-section-head reveal" ref={headRef}>
          <span className="gold-label">Built For Everyone</span>
          <h2 className="heading">Smarter matches. Better fights.</h2>
        </div>

        <div className="lv2-tabs reveal" ref={panelRef}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className="lv2-tab"
              data-active={active === t.key}
              onClick={() => setActive(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="lv2-tab-panel">
          <div className="lv2-tab-left">
            <span className="lv2-icon-box"><Icon size={22} /></span>
            <h3>{current.heading}</h3>
            <p>{current.description}</p>
            {/* TODO: replace with real app screenshot */}
            <div className="lv2-screenshot" style={{ marginTop: 16 }}>
              {current.heading} Screenshot Placeholder
            </div>
          </div>
          <div className="lv2-tab-right">
            {current.features.map(({ Icon: FIcon, title, desc }) => (
              <div key={title} className="lv2-feature">
                <span className="lv2-icon-box"><FIcon size={18} /></span>
                <div>
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
