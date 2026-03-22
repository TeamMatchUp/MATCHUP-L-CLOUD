import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Send, CheckCircle, Megaphone, Shield, ChevronDown, Users, Globe, Calendar, Swords, Building2 } from "lucide-react";

const sections = [
  {
    title: "FIGHT MATCHMAKING",
    steps: [
      {
        icon: Users,
        step: "01",
        title: "CREATE PROFILES",
        description: "Fighters and coaches create verified profiles with weight class, discipline, record, and fighting style.",
      },
      {
        icon: Swords,
        step: "02",
        title: "RUN MATCHMAKING",
        description: "The matchmaking engine scores all eligible pairs on competitiveness, entertainment, style contrast, and narrative.",
      },
      {
        icon: CheckCircle,
        step: "03",
        title: "CONFIRM BOUTS",
        description: "Organiser reviews ranked suggestions. Coach approves, fighter confirms. Only when all parties agree does a match become official.",
      },
    ],
    subtitle: "SIMPLIFY MATCHMAKING",
    tagline: "Three steps to a confirmed fight. No shortcuts.",
  },
  {
    title: "EVENT PROMOTION",
    steps: [
      {
        icon: Calendar,
        step: "01",
        title: "CREATE EVENT",
        description: "Set up your event with venue details, discipline, date, and ticket information in minutes.",
      },
      {
        icon: Swords,
        step: "02",
        title: "BUILD FIGHT CARD",
        description: "Define fight slots, use AI suggestions or manual search to fill your main event and undercard.",
      },
      {
        icon: Megaphone,
        step: "03",
        title: "PUBLISH & PROMOTE",
        description: "Your event goes live on the marketplace, visible to coaches and fighters actively seeking bouts.",
      },
    ],
    subtitle: "GROW YOUR EVENTS",
    tagline: "From empty card to sold-out show.",
  },
  {
    title: "TRUSTED DIRECTORY",
    steps: [
      {
        icon: Search,
        step: "01",
        title: "SEARCH & DISCOVER",
        description: "Search verified gyms, upcoming events, and fighter profiles with distance, discipline, and weight class filters.",
      },
      {
        icon: Shield,
        step: "02",
        title: "CLAIM YOUR LISTING",
        description: "Coaches claim their gym listing to unlock management features. Organisers claim events to manage fight cards.",
      },
      {
        icon: Globe,
        step: "03",
        title: "CONNECT",
        description: "Fighters request gym trials, coaches put forward fighters for events, and organisers receive proposals.",
      },
    ],
    subtitle: "TRUST THE RECORD",
    tagline: "Verified profiles. Verified results. No fakes.",
  },
];

export function HowItWorksSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section className="py-24 border-t border-border/30">
      <div className="container max-w-3xl">
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl text-center text-foreground mb-8 sm:mb-10">
          HOW IT <span className="text-primary">WORKS</span>
        </h2>
        <div className="flex flex-col gap-3">
          {sections.map((section, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={section.title}>
                <button
                  onClick={() => toggle(i)}
                  className={`w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 rounded-md border font-heading text-base sm:text-lg tracking-wider transition-all duration-200 ${
                    isOpen
                      ? "bg-primary/10 border-primary/40 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.15)]"
                      : "bg-muted/50 border-border/50 text-foreground hover:border-primary/30 hover:bg-muted"
                  }`}
                >
                  <span>{section.title}</span>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : "text-muted-foreground"}`}
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
                      <div className="pt-8 pb-6 px-2">
                        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl text-center text-foreground mb-2">
                          {section.subtitle.split(" ").map((word, wi, arr) =>
                            wi === arr.length - 1 ? (
                              <span key={wi} className="text-primary">{word}</span>
                            ) : (
                              <span key={wi}>{word} </span>
                            )
                          )}
                        </h2>
                        <p className="text-center text-muted-foreground mb-12 text-sm">
                          {section.tagline}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {section.steps.map((s) => (
                            <div
                              key={s.step}
                              className="relative text-center p-6 pt-10 overflow-visible group"
                            >
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none z-10">
                                <span className="font-heading text-4xl text-primary/10">{s.step}</span>
                              </div>

                              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 border border-primary/20 mb-4 mt-2 transition-all duration-250 group-hover:bg-primary/15 group-hover:border-primary/30 group-hover:shadow-[0_0_20px_hsl(46_93%_61%/0.15)]">
                                <s.icon className="h-5 w-5 text-primary" />
                              </div>
                              <h3 className="font-heading text-xl text-foreground mb-2">{s.title}</h3>
                              <p className="text-muted-foreground text-xs leading-relaxed">{s.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
