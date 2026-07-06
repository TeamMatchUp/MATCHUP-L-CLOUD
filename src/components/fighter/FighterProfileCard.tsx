import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Instagram, Twitter, Youtube, Globe, Share2 } from "lucide-react";
import { FlagIcon } from "@/components/FlagIcon";

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

const GOLD = "hsl(var(--primary))";
const GOLD_TINT = "rgba(232,160,32,0.12)";
const SURFACE = "hsl(var(--card))";
const INSET = "hsl(var(--muted))";
const TEXT = "hsl(var(--foreground))";
const MUTED = "hsl(var(--muted-foreground))";
const GREEN = "hsl(var(--success))";
const RED = "hsl(var(--destructive))";
const CARD_SHADOW = "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)";
const INSET_SHADOW = "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)";

const formatHeight = (cm?: number | null) => {
  if (!cm) return "—";
  const totalIn = Math.round(cm / 2.54);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn % 12;
  return `${ft}'${inch}"`;
};
const formatReach = (cm?: number | null) => cm ? `${Math.round(cm / 2.54)}"` : "—";
const computeAge = (dob?: string | null) => {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
};

export interface FighterProfileCardData {
  id: string;
  name: string;
  country?: string | null;
  weight_class: string;
  discipline?: string | null;
  profile_image?: string | null;
  _avatar?: string | null;
  height?: number | null;
  reach?: number | null;
  walk_around_weight_kg?: number | null;
  stance?: string | null;
  date_of_birth?: string | null;
  gymName?: string;
  wins: number;
  losses: number;
  draws: number;
  kos: number;
}

function StatPill({ value, label, color, bg }: { value: string | number; label: string; color: string; bg?: string }) {
  return (
    <div className="flex-1 min-w-0" style={{
      background: bg ?? INSET, borderRadius: 10, padding: "8px 4px", textAlign: "center",
      boxShadow: INSET_SHADOW,
    }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color, lineHeight: 1, letterSpacing: "0.02em" }}>{value}</div>
      <div style={{ fontSize: 9, color: MUTED, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 3 }}>{label}</div>
    </div>
  );
}

export function FighterProfileCard({ fighter, index = 0 }: { fighter: FighterProfileCardData; index?: number }) {
  const avatar = fighter._avatar ?? fighter.profile_image ?? null;
  const initials = fighter.name.split(" ").filter(n => !n.startsWith('"')).map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const total = fighter.wins + fighter.losses + fighter.draws;
  const winRate = total > 0 ? Math.round((fighter.wins / total) * 100) : 0;
  const age = computeAge(fighter.date_of_birth);
  const gymName = fighter.gymName || "Independent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Link
        to={`/fighters/${fighter.id}`}
        className="block relative p-5"
        style={{
          background: SURFACE,
          borderRadius: 16,
          boxShadow: CARD_SHADOW,
          height: "100%",
          transition: "transform 0.25s ease, box-shadow 0.25s ease",
        }}
      >
        {/* Share (left) */}
        <div style={{ position: "absolute", top: 12, left: 12, zIndex: 2 }}>
          <div className="w-8 h-8" style={{
            borderRadius: "50%", background: INSET, color: MUTED,
            display: "flex", alignItems: "center", justifyContent: "center", boxShadow: INSET_SHADOW,
          }}>
            <Share2 className="w-3.5 h-3.5" />
          </div>
        </div>
        {/* Follow (right) */}
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 2 }}>
          <div className="px-2.5 py-1 text-[10px]" style={{
            borderRadius: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
            background: "transparent", color: GOLD, border: `1.5px solid ${GOLD}`,
          }}>
            + Follow
          </div>
        </div>

        {/* Avatar */}
        <div className="mx-auto mt-8" style={{
          width: 110, height: 110, borderRadius: "50%",
          border: `2px solid ${GOLD}`,
          boxShadow: `0 0 0 4px rgba(232,160,32,0.08), 0 0 24px rgba(232,160,32,0.15)`,
          overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: avatar ? "transparent" : "linear-gradient(135deg, rgba(232,160,32,0.18), rgba(232,160,32,0.04))",
        }}>
          {avatar ? (
            <img src={avatar} alt={fighter.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, color: GOLD, letterSpacing: "0.04em" }}>{initials}</span>
          )}
        </div>

        {/* Name */}
        <h3 className="text-center mt-4" style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(1.5rem, 2vw, 1.9rem)",
          color: TEXT, letterSpacing: "0.02em", lineHeight: 1,
        }}>
          {fighter.name.toUpperCase()}
        </h3>

        {/* Country · weight · discipline */}
        <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap" style={{ fontSize: 11, color: MUTED }}>
          {fighter.country && <FlagIcon countryCode={fighter.country} size={14} />}
          {fighter.country && <span style={{ fontWeight: 600 }}>{fighter.country}</span>}
          <span>·</span>
          <span>{WEIGHT_CLASS_LABELS[fighter.weight_class] || fighter.weight_class}</span>
          <span>·</span>
          <span style={{ textTransform: "uppercase" }}>{fighter.discipline || "—"}</span>
        </div>

        {/* Stat pills */}
        <div className="flex gap-1.5 mt-4">
          <StatPill value={fighter.wins} label="W" color={GREEN} bg="rgba(34,197,94,0.12)" />
          <StatPill value={fighter.losses} label="L" color={RED} bg="rgba(239,68,68,0.12)" />
          <StatPill value={fighter.draws} label="D" color={MUTED} />
          <StatPill value={fighter.kos} label="KOs" color={GOLD} bg={GOLD_TINT} />
          <StatPill value={`${winRate}%`} label="Win %" color={GOLD} bg={GOLD_TINT} />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "14px 0 10px" }} />

        {/* HT / RCH / WT */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5" style={{ fontSize: 11 }}>
          {[
            { l: "HT", v: formatHeight(fighter.height) },
            { l: "RCH", v: formatReach(fighter.reach) },
            { l: "WT", v: fighter.walk_around_weight_kg ? `${Math.round(fighter.walk_around_weight_kg * 2.205)} lbs` : "—" },
          ].map(m => (
            <div key={m.l} className="flex items-center gap-1">
              <span style={{ color: MUTED, fontWeight: 700, letterSpacing: "0.08em" }}>{m.l}</span>
              <span style={{ color: TEXT, fontWeight: 600 }}>{m.v}</span>
            </div>
          ))}
        </div>

        {/* STANCE / AGE / GYM */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2" style={{ fontSize: 11 }}>
          {[
            { l: "STANCE", v: fighter.stance ? fighter.stance.charAt(0).toUpperCase() + fighter.stance.slice(1) : "—" },
            { l: "AGE", v: age ?? "—" },
            { l: "GYM", v: gymName },
          ].map(m => (
            <div key={m.l} className="flex items-center gap-1 min-w-0">
              <span style={{ color: MUTED, fontWeight: 700, letterSpacing: "0.08em" }}>{m.l}</span>
              <span style={{ color: TEXT, fontWeight: 600 }} className="truncate">{m.v}</span>
            </div>
          ))}
        </div>

        {/* Socials */}
        <div className="flex gap-2 mt-4">
          {[Instagram, Twitter, Youtube, Globe].map((Icon, i) => (
            <div key={i} style={{
              width: 26, height: 26, borderRadius: 7, background: INSET,
              display: "flex", alignItems: "center", justifyContent: "center", color: MUTED,
              boxShadow: INSET_SHADOW,
            }}>
              <Icon style={{ width: 12, height: 12 }} />
            </div>
          ))}
        </div>
      </Link>
    </motion.div>
  );
}
