import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BannerAd } from "@/components/BannerAd";
import iconImg from "@/assets/icon-gold.webp";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useState } from "react";
import React from "react";
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

import { STYLE_LABELS } from "@/lib/format";

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

      // Fetch avatars for fighters with linked accounts
      const userIds = (data ?? []).map((f) => f.user_id).filter(Boolean) as string[];
      let avatarMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, avatar_url")
          .in("id", userIds);
        profiles?.forEach((p) => { if (p.avatar_url) avatarMap.set(p.id, p.avatar_url); });
      }

      // Fetch all fights for dynamic record calculation
      const fighterIds = (data ?? []).map(f => f.id);
      const { data: fightsA } = await supabase
        .from("fights")
        .select("*")
        .in("fighter_a_id", fighterIds);
      const { data: fightsB } = await supabase
        .from("fights")
        .select("*")
        .in("fighter_b_id", fighterIds);
      
      const fightMap = new Map<string, any>();
      [...(fightsA || []), ...(fightsB || [])].forEach((f) => fightMap.set(f.id, f));
      const allFights = Array.from(fightMap.values());

      // Calculate dynamic records
      const recordMap = new Map<string, { wins: number; losses: number; draws: number }>();
      (data ?? []).forEach((fighter) => {
        let wins = 0, losses = 0, draws = 0;
        allFights.forEach((fight) => {
          const isA = fight.fighter_a_id === fighter.id;
          const isB = fight.fighter_b_id === fighter.id;
          if (!isA && !isB) return;
          
          // Skip truly invalid self-fights (no opponent_name means bad data)
          if (fight.fighter_a_id === fight.fighter_b_id && !fight.opponent_name) return;

          // For self-referencing fights (external opponent), treat as fighter_a's perspective
          const isSelfRef = fight.fighter_a_id === fight.fighter_b_id;
          const result = fight.result as string;

          // Prioritize winner_id if set
          if (fight.winner_id) {
            if (fight.winner_id === fighter.id) wins++;
            else losses++;
          } else if (result === "draw") {
            draws++;
          } else if (result === "win") {
            if (isSelfRef || isA) wins++;
            else losses++;
          } else if (result === "loss") {
            if (isSelfRef || isA) losses++;
            else wins++;
          }
        });
        recordMap.set(fighter.id, { wins, losses, draws });
      });

      return (data ?? []).map((f) => ({
        ...f,
        _avatar: f.profile_image || (f.user_id ? avatarMap.get(f.user_id) : null) || null,
        _record: recordMap.get(f.id) || { wins: 0, losses: 0, draws: 0 },
      }));
    },
  });

  // Client-side search filtering across name, gym, record, style, weight
  const filteredFighters = fighters?.filter((fighter) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const primaryGym = fighter.fighter_gym_links?.find((l: any) => l.is_primary);
    const gymName = primaryGym?.gyms?.name ?? "Independent";
    const record = `${fighter._record.wins}-${fighter._record.losses}-${fighter._record.draws}`;
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
            <div className="flex items-center justify-between mb-2">
              <motion.h1
                className="font-heading text-5xl md:text-6xl text-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                FIGHTER <span className="text-primary">ROSTER</span>
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-3 bg-muted hover:bg-muted/80 text-foreground font-medium text-sm px-8 py-3 rounded-full transition-colors duration-200"
                >
                  <img src={iconImg} alt="" className="h-5 w-5" />
                  create account
                </Link>
              </motion.div>
            </div>
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
                  const record = `${fighter._record.wins}-${fighter._record.losses}-${fighter._record.draws}`;

                  return (
                    <React.Fragment key={fighter.id}>
                      {i > 0 && i % 5 === 0 && <BannerAd variant="grid-break" />}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.06 }}
                      >
                        <Link
                          to={`/fighters/${fighter.id}`}
                          className="rounded-lg border border-border bg-card p-6 hover:gold-border-subtle transition-all duration-250 block"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center font-heading text-lg text-muted-foreground overflow-hidden shrink-0">
                              {fighter._avatar ? (
                                <img src={fighter._avatar} alt={fighter.name} className="h-full w-full object-cover" />
                              ) : (
                                fighter.name.split(" ").filter((n: string) => !n.startsWith('"')).map((n: string) => n[0]).join("").slice(0, 2)
                              )}
                            </div>
                            <h3 className="font-heading text-lg text-foreground">{fighter.name}</h3>
                          </div>
                          <p className="text-primary font-bold text-lg">{record}</p>
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <p>{WEIGHT_CLASS_LABELS[fighter.weight_class]} · {fighter.style ? STYLE_LABELS[fighter.style] : "—"}</p>
                            <p>{gymName}</p>
                          </div>
                        </Link>
                      </motion.div>
                    </React.Fragment>
                  );
                })}
                {filteredFighters.length < 5 && <BannerAd variant="grid-break" />}
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
