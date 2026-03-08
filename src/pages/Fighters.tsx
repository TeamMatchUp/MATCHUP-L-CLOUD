import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BannerAd } from "@/components/BannerAd";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Filter, Search, ShieldCheck } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type CountryCode = Database["public"]["Enums"]["country_code"];
type WeightClass = Database["public"]["Enums"]["weight_class"];
type FightingStyle = Database["public"]["Enums"]["fighting_style"];

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

const STYLE_LABELS: Record<string, string> = {
  boxing: "Boxing", muay_thai: "Muay Thai", mma: "MMA", kickboxing: "Kickboxing", bjj: "BJJ",
};

const Fighters = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [weightFilter, setWeightFilter] = useState<string>("all");
  const [styleFilter, setStyleFilter] = useState<string>("all");

  const { data: fighters, isLoading } = useQuery({
    queryKey: ["fighters", countryFilter, weightFilter, styleFilter],
    queryFn: async () => {
      let query = supabase
        .from("fighter_profiles")
        .select("*, fighter_gym_links(gym_id, is_primary, gyms(name))")
        .order("name");

      if (countryFilter !== "all") query = query.eq("country", countryFilter as CountryCode);
      if (weightFilter !== "all") query = query.eq("weight_class", weightFilter as WeightClass);
      if (styleFilter !== "all") query = query.eq("style", styleFilter as FightingStyle);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Client-side search filtering across name, gym, record, style, weight
  const filteredFighters = fighters?.filter((fighter) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const primaryGym = fighter.fighter_gym_links?.find((l: any) => l.is_primary);
    const gymName = primaryGym?.gyms?.name ?? "Independent";
    const record = `${fighter.record_wins}-${fighter.record_losses}-${fighter.record_draws}`;
    const styleLabel = fighter.style ? STYLE_LABELS[fighter.style] || fighter.style : "";
    const weightLabel = WEIGHT_CLASS_LABELS[fighter.weight_class] || fighter.weight_class;

    return (
      fighter.name.toLowerCase().includes(q) ||
      gymName.toLowerCase().includes(q) ||
      record.includes(q) ||
      styleLabel.toLowerCase().includes(q) ||
      weightLabel.toLowerCase().includes(q) ||
      fighter.country.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container">
            <motion.h1
              className="font-heading text-5xl md:text-6xl text-foreground mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              FIGHTER <span className="text-primary">ROSTER</span>
            </motion.h1>
            <motion.p
              className="text-muted-foreground mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Explore active fighters across weight classes and disciplines.
            </motion.p>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, gym, weight class, style, record..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base bg-card border-border"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-8">
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  <SelectItem value="UK">UK</SelectItem>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="AUS">Australia</SelectItem>
                </SelectContent>
              </Select>
              <Select value={weightFilter} onValueChange={setWeightFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Weight Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Weights</SelectItem>
                  {Object.entries(WEIGHT_CLASS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={styleFilter} onValueChange={setStyleFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Styles</SelectItem>
                  {Object.entries(STYLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-48 rounded-lg bg-card animate-pulse" />
                ))}
              </div>
            ) : filteredFighters && filteredFighters.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredFighters.map((fighter, i) => {
                  const primaryGym = fighter.fighter_gym_links?.find((l: any) => l.is_primary);
                  const gymName = primaryGym?.gyms?.name ?? "Independent";
                  const record = `${fighter.record_wins}-${fighter.record_losses}-${fighter.record_draws}`;

                  return (
                    <motion.div
                      key={fighter.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.06 }}
                    >
                      <Link
                        to={`/fighters/${fighter.id}`}
                        className="rounded-lg border border-border bg-card p-6 hover:gold-border-subtle transition-all duration-250 block"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center font-heading text-lg text-muted-foreground">
                            {fighter.name.split(" ").filter((n: string) => !n.startsWith('"')).map((n: string) => n[0]).join("").slice(0, 2)}
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${fighter.available ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                            {fighter.available ? "Available" : "Booked"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <h3 className="font-heading text-lg text-foreground">{fighter.name}</h3>
                          {fighter.verified && <ShieldCheck className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="text-primary font-bold text-lg mt-1">{record}</p>
                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          <p>{WEIGHT_CLASS_LABELS[fighter.weight_class]} · {fighter.style ? STYLE_LABELS[fighter.style] : "—"}</p>
                          <p>{gymName}</p>
                          {fighter.height && fighter.reach && <p>{fighter.height} · {fighter.reach} reach</p>}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">No fighters found.</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Fighters;
