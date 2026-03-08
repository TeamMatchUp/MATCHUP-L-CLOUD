import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { MapPin, Filter, Users, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type CountryCode = Database["public"]["Enums"]["country_code"];

export default function Gyms() {
  const [countryFilter, setCountryFilter] = useState<string>("all");

  const { data: gyms, isLoading } = useQuery({
    queryKey: ["gyms", countryFilter],
    queryFn: async () => {
      let query = supabase
        .from("gyms")
        .select("*, fighter_gym_links(fighter_id)")
        .order("name");

      if (countryFilter !== "all") {
        query = query.eq("country", countryFilter as CountryCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
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
              GYM <span className="text-primary">DIRECTORY</span>
            </motion.h1>
            <motion.p
              className="text-muted-foreground mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Browse registered gyms and coaching teams.
            </motion.p>

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
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 rounded-lg bg-card animate-pulse" />
                ))}
              </div>
            ) : gyms && gyms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {gyms.map((gym, i) => (
                  <motion.div
                    key={gym.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                  >
                    <Link
                      to={`/gyms/${gym.id}`}
                      className="rounded-lg border border-border bg-card p-6 hover:gold-border-subtle transition-all duration-250 block h-full"
                    >
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center font-heading text-lg text-muted-foreground mb-4">
                        {gym.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex items-center gap-1">
                        <h3 className="font-heading text-xl text-foreground mb-1">{gym.name}</h3>
                        {gym.verified && <ShieldCheck className="h-4 w-4 text-primary" />}
                      </div>
                      {gym.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                          <MapPin className="h-3 w-3" />{gym.location}
                        </p>
                      )}
                      {gym.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{gym.description}</p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {gym.fighter_gym_links?.length ?? 0} fighters
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">No gyms found.</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
