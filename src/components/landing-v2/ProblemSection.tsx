import { MessageCircle, Send, Megaphone, XCircle } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const rows = [
  { Icon: MessageCircle, title: "WhatsApp Groups", desc: "Important fights get lost in endless messages." },
  { Icon: Send, title: "DMs & Spreadsheets", desc: "No structure. No visibility. No way to compare." },
  { Icon: Megaphone, title: "Word of Mouth", desc: "Great fighters get missed. Opportunities get lost." },
  { Icon: XCircle, title: "No Standardisation", desc: "No verified records. No trust. No progress." },
];

export function ProblemSection() {
  const headRef = useScrollReveal();
  const rowsRef = useScrollReveal();
  const shotRef = useScrollReveal();

  return (
    <section className="lv2-section">
      <div className="container">
        <div className="lv2-section-head reveal" ref={headRef}>
          <span className="gold-label">The Problem</span>
          <h2 className="heading">
            Combat sports <span style={{ color: "#8b909e" }}>deserves better.</span>
          </h2>
          <p>The industry still runs on outdated systems.</p>
        </div>

        <div className="lv2-problem-rows reveal" ref={rowsRef}>
          {rows.map(({ Icon, title, desc }) => (
            <div key={title} className="lv2-problem-row">
              <span className="lv2-icon-box"><Icon size={20} /></span>
              <h3>{title}</h3>
              <span className="divider" />
              <p>{desc}</p>
            </div>
          ))}
        </div>

        {/* TODO: replace with real app screenshot */}
        <div className="lv2-screenshot reveal" ref={shotRef}>
          Product Screenshot Placeholder
        </div>
      </div>
    </section>
  );
}
