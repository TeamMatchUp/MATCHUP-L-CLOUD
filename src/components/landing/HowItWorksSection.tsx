import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Send, CheckCircle, Megaphone, Star, ChevronDown, Shield, Users, Globe } from "lucide-react";

const sections = [
  {
    title: "FIGHT MATCHMAKING",
    steps: [
      {
        icon: Search,
        step: "01",
        title: "DISCOVER",
        description: "Browse events, explore fighters, and find the right matchups across weight classes and styles.",
      },
      {
        icon: Send,
        step: "02",
        title: "PROPOSE",
        description: "Organisers create structured match proposals. AI assists with optimal pairing recommendations.",
      },
      {
        icon: CheckCircle,
        step: "03",
        title: "CONFIRM",
        description: "Coach approves, fighter confirms. Only when all parties agree does a match become official.",
      },
    ],
    subtitle: "SIMPLIFY MATCHMAKING HEADACHES",
    tagline: "Three steps to a confirmed fight. No shortcuts.",
  },
  {
    title: "EVENT PROMOTION",
    steps: [
      {
        icon: Megaphone,
        step: "01",
        title: "CREATE",
        description: "Set up your event with venue details, fight card structure, and ticket information in minutes.",
      },
      {
        icon: Globe,
        step: "02",
        title: "PROMOTE",
        description: "Your event is listed on the marketplace, visible to coaches and fighters actively seeking bouts.",
      },
      {
        icon: Users,
        step: "03",
        title: "FILL YOUR CARD",
        description: "Receive applications, use AI suggestions, and confirm matchups to build a complete fight card.",
      },
    ],
    subtitle: "GROW YOUR EVENTS",
    tagline: "From empty card to sold-out show.",
  },
  {
    title: "VERIFIED DIRECTORY",
    steps: [
      {
        icon: Shield,
        step: "01",
        title: "REGISTER",
        description: "Fighters and gyms create verified profiles with records, credentials, and fighting history.",
      },
      {
        icon: Star,
        step: "02",
        title: "BUILD REPUTATION",
        description: "Fight results are logged and verified by both corners, creating a trusted public record.",
      },
      {
        icon: Search,
        step: "03",
        title: "GET DISCOVERED",
        description: "Organisers search the directory by weight class, record, and availability to find the right fighters.",
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
