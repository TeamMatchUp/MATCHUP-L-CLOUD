import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { BrowserFrame } from "./BrowserFrame";
import fighterShot from "@/assets/landing/fighter-showcase-new.png";
import coachShot from "@/assets/landing/coach-showcase-new.webp";
import organiserShot from "@/assets/landing/organiser-showcase-new.webp";

type Feature = {
  eyebrow: string;
  title: string[];
  body: string;
  bullets: string[];
  cta: { label: string; to: string };
  image: string;
  imageAlt: string;
};

const features: Feature[] = [
  {
    eyebrow: "FOR FIGHTERS",
    title: ["YOUR CAREER,", "ONE COMMAND CENTRE."],
    body: "Every offer, callout and contract lands in your Action Centre. Accept a bout in two taps, keep your record verified, and match efficiently from the Matchup network.",
    bullets: [
      "Verified record & fight history with live automated analytics",
      "Match offers straight to your inbox",
      "Availability toggle — one switch",
    ],
    cta: { label: "Explore fighters", to: "/explore?tab=fighters" },
    image: fighterShot,
    imageAlt: "Fighter dashboard preview",
  },
  {
    eyebrow: "FOR COACHES",
    title: ["RUN THE GYM.", "GROW THE ROSTER."],
    body: "Find new members authentically. Approve join requests, track roster analytics and gym views, and manage every fighter's calendar from a single overview. Your fighters deserve better than WhatsApp and Facebook to grow their career.",
    bullets: [
      "Advertise to the whole Matchup network",
      "All-in-one fighter matchmaking",
      "Fighter performance analytics",
      "Integrated events calendar",
    ],
    cta: { label: "Explore gyms", to: "/explore?tab=gyms" },
    image: coachShot,
    imageAlt: "Coach dashboard preview",
  },
  {
    eyebrow: "FOR ORGANISERS",
    title: ["BUILD CARDS", "THAT SELL OUT."],
    body: 'The old saying of "who you know" just got a whole lot easier — search the entire Matchup network of verified fighters either manually or with SmartMatchup. Send and track offers, confirm bouts and publish your event cards to the platform.',
    bullets: [
      "Effortless matchmaking with detailed analytics",
      "Fight proposal tracker",
      "One-click event publishing",
      "Ticket sales integration",
    ],
    cta: { label: "Explore events", to: "/explore?tab=events" },
    image: organiserShot,
    imageAlt: "Organiser fight card builder preview",
  },
];

export function FeatureShowcase() {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      <div className="container">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl text-foreground mb-3">
            THREE SIDES. <span className="text-primary">ONE PLATFORM.</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            MatchUp connects the three key roles in combat sports matchmaking into a single, streamlined workflow.
          </p>
        </motion.div>

        <div className="flex flex-col gap-24 sm:gap-32">
          {features.map((f, i) => {
            const reverse = i % 2 === 1;
            return (
              <div
                key={f.eyebrow}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
                  reverse ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                {/* Copy */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6 }}
                >
                  <p className="font-body uppercase text-primary text-xs tracking-[0.24em] mb-4">
                    {f.eyebrow}
                  </p>
                  <h3 className="font-heading leading-[0.95] tracking-tight mb-5">
                    {f.title.map((line, li) => (
                      <span
                        key={li}
                        className="block text-foreground"
                        style={{ fontSize: "clamp(1.85rem, 3.6vw, 3rem)" }}
                      >
                        {line}
                      </span>
                    ))}
                  </h3>
                  <p className="text-muted-foreground text-base leading-relaxed mb-6 max-w-lg">
                    {f.body}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {f.bullets.map((b, bi) => (
                      <motion.li
                        key={bi}
                        className="flex items-start gap-3 text-sm text-foreground/85"
                        initial={{ opacity: 0, x: -12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35, delay: 0.15 + bi * 0.08 }}
                      >
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/15 border border-primary/25 shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                        </span>
                        <span>{b}</span>
                      </motion.li>
                    ))}
                  </ul>
                  <Link
                    to={f.cta.to}
                    className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-heading tracking-wider text-lg group/cta"
                  >
                    {f.cta.label}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-1" />
                  </Link>
                </motion.div>

                {/* Screenshot */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                >
                  <BrowserFrame>
                    <img
                      src={f.image}
                      alt={f.imageAlt}
                      loading="lazy"
                      className="w-full h-auto block"
                    />
                  </BrowserFrame>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
