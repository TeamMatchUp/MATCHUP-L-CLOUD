import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Send, CheckCircle, Megaphone, Star, ChevronDown, Shield, Users, Globe } from "lucide-react";

const sections = [
  {
    title: "Fight matchmaking",
    steps: [
      { icon: Search, step: "01", title: "Discover", description: "Browse events, explore fighters, and find the right matchups across weight classes and styles." },
      { icon: Send, step: "02", title: "Propose", description: "Organisers create structured match proposals. AI assists with optimal pairing recommendations." },
      { icon: CheckCircle, step: "03", title: "Confirm", description: "Coach approves, fighter confirms. Only when all parties agree does a match become official." },
    ],
    subtitle: "Simplify matchmaking headaches",
    tagline: "Three steps to a confirmed fight. No shortcuts.",
  },
  {
    title: "Event promotion",
    steps: [
      { icon: Megaphone, step: "01", title: "Create", description: "Set up your event with venue details, fight card structure, and ticket information in minutes." },
      { icon: Globe, step: "02", title: "Promote", description: "Your event is listed on the marketplace, visible to coaches and fighters actively seeking bouts." },
      { icon: Users, step: "03", title: "Fill your card", description: "Receive applications, use AI suggestions, and confirm matchups to build a complete fight card." },
    ],
    subtitle: "Grow your events",
    tagline: "From empty card to sold-out show.",
  },
  {
    title: "Verified directory",
    steps: [
      { icon: Shield, step: "01", title: "Register", description: "Fighters and gyms create verified profiles with records, credentials, and fighting history." },
      { icon: Star, step: "02", title: "Build reputation", description: "Fight results are logged and verified by both corners, creating a trusted public record." },
      { icon: Search, step: "03", title: "Get discovered", description: "Organisers search the directory by weight class, record, and availability to find the right fighters." },
    ],
    subtitle: "Trust the record",
    tagline: "Verified profiles. Verified results. No fakes.",
  },
];

export function HowItWorksSection() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="py-24 border-t border-[var(--mu-border)]">
      <div className="container max-w-3xl">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium text-center text-[var(--mu-t1)] mb-8 sm:mb-10">
          How it <span className="text-[var(--mu-gold)]">works</span>
        </h2>

        {/* Tab bar */}
        <div className="mu-tab-bar mb-10">
          {sections.map((section, i) => (
            <button
              key={section.title}
              onClick={() => setActiveTab(i)}
              className={`mu-tab-item ${activeTab === i ? "active" : ""}`}
            >
              <span className="mu-tab-label text-[10px]">{section.title}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <div className="text-center mb-10">
              <h3 className="text-xl sm:text-2xl font-medium text-[var(--mu-t1)] mb-2">
                {sections[activeTab].subtitle}
              </h3>
              <p className="text-sm text-[var(--mu-t3)]">{sections[activeTab].tagline}</p>
            </div>

            {/* Vertical timeline */}
            <div className="flex flex-col gap-0">
              {sections[activeTab].steps.map((s, i) => (
                <div key={s.step} className="flex gap-4">
                  {/* Timeline column */}
                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-[10px] bg-[var(--mu-gold-t)] border border-[var(--mu-gold-b)] flex items-center justify-center shrink-0">
                      <s.icon className="h-4 w-4 text-[var(--mu-gold)]" />
                    </div>
                    {i < sections[activeTab].steps.length - 1 && (
                      <div className="w-px flex-1 bg-[var(--mu-border)] mx-auto mt-1.5 min-h-[32px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-8">
                    <p className="text-[10px] text-[var(--mu-t3)] font-medium mb-1">Step {s.step}</p>
                    <h4 className="text-sm font-medium text-[var(--mu-t1)] mb-1">{s.title}</h4>
                    <p className="text-xs text-[var(--mu-t3)] leading-relaxed">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
