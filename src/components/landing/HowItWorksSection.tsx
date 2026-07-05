import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CheckCircle, Megaphone, Shield, ChevronDown, Users, Globe, Calendar, Swords } from "lucide-react";

const sections = [
  {
    title: "FIGHT MATCHMAKING",
    subtitle: "SIMPLIFY MATCHMAKING",
    tagline: "Three steps to a confirmed fight. No shortcuts.",
    steps: [
      { icon: Users, step: "01", title: "CREATE PROFILES", description: "Fighters and coaches create verified profiles with weight class, discipline, record, and fighting style." },
      { icon: Swords, step: "02", title: "RUN MATCHMAKING", description: "The matchmaking engine scores all eligible pairs on competitiveness, entertainment, style contrast, and narrative." },
      { icon: CheckCircle, step: "03", title: "CONFIRM BOUTS", description: "Organiser reviews ranked suggestions. Coach approves, fighter confirms. Only when all parties agree does a match become official." },
    ],
  },
  {
    title: "EVENT PROMOTION",
    subtitle: "GROW YOUR EVENTS",
    tagline: "From empty card to sold-out show.",
    steps: [
      { icon: Calendar, step: "01", title: "CREATE EVENT", description: "Set up your event with venue details, discipline, date, and ticket information in minutes." },
      { icon: Swords, step: "02", title: "BUILD FIGHT CARD", description: "Define fight slots, use AI suggestions or manual search to fill your main event and undercard." },
      { icon: Megaphone, step: "03", title: "PUBLISH & PROMOTE", description: "Your event goes live on the marketplace, visible to coaches and fighters actively seeking bouts." },
    ],
  },
  {
    title: "TRUSTED DIRECTORY",
    subtitle: "TRUST THE RECORD",
    tagline: "Verified profiles. Verified results. No fakes.",
    steps: [
      { icon: Search, step: "01", title: "SEARCH & DISCOVER", description: "Search verified gyms, upcoming events, and fighter profiles with distance, discipline, and weight class filters." },
      { icon: Shield, step: "02", title: "CLAIM YOUR LISTING", description: "Coaches claim their gym listing to unlock management features. Organisers claim events to manage fight cards." },
      { icon: Globe, step: "03", title: "CONNECT", description: "Fighters request gym trials, coaches put forward fighters for events, and organisers receive proposals." },
    ],
  },
];

const CARD_SHADOW =
  "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)";

export function HowItWorksSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section className="py-24">
      <div className="container max-w-3xl">
        <motion.h2
          className="font-heading text-3xl sm:text-4xl md:text-5xl text-center text-foreground mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          HOW IT <span className="text-primary">WORKS</span>
        </motion.h2>

        <div className="flex flex-col gap-4">
          {sections.map((section, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={section.title}
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: "hsl(var(--card))", boxShadow: CARD_SHADOW }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
              >
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between px-5 sm:px-7 py-5 font-heading tracking-wider text-left transition-colors"
                >
                  <span
                    className={`text-lg sm:text-xl ${isOpen ? "text-primary" : "text-foreground"}`}
                  >
                    {section.title}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform duration-200 text-primary ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 sm:px-7 pb-8 pt-2">
                        <p className="font-heading text-xl sm:text-2xl text-foreground">
                          {section.subtitle.split(" ").map((word, wi, arr) =>
                            wi === arr.length - 1 ? (
                              <span key={wi} className="text-primary">{word}</span>
                            ) : (
                              <span key={wi}>{word} </span>
                            )
                          )}
                        </p>
                        <p className="text-muted-foreground text-sm mt-1 mb-8">
                          {section.tagline}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          {section.steps.map((s) => (
                            <div
                              key={s.step}
                              className="relative rounded-lg p-5 pt-8"
                              style={{
                                backgroundColor: "hsl(var(--muted))",
                                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)",
                              }}
                            >
                              <span className="absolute top-3 right-4 font-heading text-2xl text-primary/25 leading-none">
                                {s.step}
                              </span>
                              <div className="inline-flex items-center justify-center h-10 w-10 rounded-full mb-3"
                                style={{ background: "rgba(232,160,32,0.12)" }}>
                                <s.icon className="h-4 w-4 text-primary" />
                              </div>
                              <h3 className="font-heading text-base text-foreground mb-1.5 tracking-wider">
                                {s.title}
                              </h3>
                              <p className="text-muted-foreground text-xs leading-relaxed">
                                {s.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
