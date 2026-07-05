import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FlagIcon } from "@/components/FlagIcon";
import { STYLE_LABELS } from "@/lib/format";

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

export interface FighterCardData {
  id: string;
  name: string;
  country?: string | null;
  region?: string | null;
  discipline?: string | null;
  weight_class: string;
  style?: string | null;
  available?: boolean | null;
  profile_image?: string | null;
  _avatar?: string | null;
  wins: number;
  losses: number;
  draws: number;
  kos?: number;
  gymName?: string;
}

interface Props {
  fighter: FighterCardData;
  index?: number;
  animate?: boolean;
}

export function FighterCard({ fighter, index = 0, animate = true }: Props) {
  const record = `${fighter.wins}–${fighter.losses}–${fighter.draws}`;
  const avatar = fighter._avatar ?? fighter.profile_image ?? null;
  const initials = fighter.name
    .split(" ")
    .filter((n) => !n.startsWith('"'))
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const weight = WEIGHT_CLASS_LABELS[fighter.weight_class] ?? fighter.weight_class;
  const discipline = fighter.discipline || (fighter.style ? STYLE_LABELS[fighter.style] : "");
  const locationLine = [fighter.region, discipline].filter(Boolean).join(" · ");

  const Body = (
    <Link
      to={`/fighters/${fighter.id}`}
      className="group block h-full rounded-xl p-5 sm:p-6 mu-card"
      style={{
        backgroundColor: "#111318",
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="h-14 w-14 rounded-full bg-muted flex items-center justify-center font-heading text-lg text-muted-foreground overflow-hidden shrink-0 transition-all"
          style={{ boxShadow: "inset 0 0 0 1px rgba(232,160,32,0.15)" }}
        >
          {avatar ? (
            <img src={avatar} alt={fighter.name} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        {fighter.available && (
          <span
            className="text-[10px] font-medium px-2.5 py-1 rounded-full text-success uppercase tracking-widest"
            style={{
              background: "rgba(34,197,94,0.12)",
              backdropFilter: "blur(6px)",
            }}
          >
            Available
          </span>
        )}
      </div>

      <h3 className="font-heading text-lg sm:text-xl text-foreground leading-tight tracking-wide">
        {fighter.name}
      </h3>
      <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
        {fighter.country && <FlagIcon countryCode={fighter.country} size={14} />}
        <span className="truncate">{locationLine || fighter.country || "—"}</span>
      </p>

      <div
        className="mt-5 pt-4 grid grid-cols-3 gap-3"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
      >
        <div>
          <p className="font-heading text-lg text-foreground tabular-nums">{record}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
            Record
          </p>
        </div>
        <div>
          <p className="font-heading text-lg text-primary tabular-nums">{fighter.kos ?? 0}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
            KOs
          </p>
        </div>
        <div>
          <p className="font-heading text-sm text-foreground leading-tight">{weight}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
            Class
          </p>
        </div>
      </div>
    </Link>
  );

  if (!animate) return Body;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      {Body}
    </motion.div>
  );
}
