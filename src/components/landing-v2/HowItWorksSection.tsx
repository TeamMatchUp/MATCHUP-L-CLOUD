import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const STEPS = [
  { num: "01", title: "Set Your Criteria", desc: "Define the rules, weight classes and slots for your event." },
  { num: "02", title: "Review Match Details", desc: "Compare stats, records and compatibility breakdowns." },
  { num: "03", title: "Confirm & Add To Card", desc: "Lock in the fight and add it to your event card." },
  { num: "04", title: "Build Your Card", desc: "Repeat the process to fill all your fight slots." },
  { num: "05", title: "Publish Your Card", desc: "Finalise and publish your event for the world to see." },
  { num: "06", title: "Manage & Update", desc: "Make changes anytime and keep your card up to date." },
];

export function HowItWorksSection() {
  const [open, setOpen] = useState(0);
  const headRef = useScrollReveal();
  const accRef = useScrollReveal();

  return (
    <section className="lv2-section" id="how-it-works">
      <div className="container">
        <div className="lv2-section-head reveal" ref={headRef}>
          <span className="gold-label">The Process</span>
          <h2 className="heading">The matchmaking process.</h2>
          <p>Find the right fights. Fill your card. Build an unforgettable event.</p>
        </div>

        <div className="lv2-accordion reveal" ref={accRef}>
          {STEPS.map((s, i) => (
            <div key={s.num} className="lv2-step" data-open={open === i}>
              <button
                type="button"
                className="lv2-step-button"
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? -1 : i)}
              >
                <span className="lv2-step-num">{s.num}</span>
                <span className="lv2-step-title">{s.title}</span>
                <ChevronDown className="lv2-step-chevron" size={20} />
              </button>
              <div className="lv2-step-panel">
                <div className="lv2-step-panel-inner">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
