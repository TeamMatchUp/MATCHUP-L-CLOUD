import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { MapPin, Calendar, ArrowRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useState } from "react";
import type { Database } from "@/integrations/supabase/types";

type CountryCode = Database["public"]["Enums"]["country_code"];

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

const Events = () => {
  const [countryFilter, setCountryFilter] = useState<string>("all");

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", countryFilter],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("*, fight_slots(*)")
        .eq("status", "published")
        .order("date", { ascending: true });

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
              ALL <span className="text-primary">EVENTS</span>
            </motion.h1>
            <motion.p
              className="text-muted-foreground mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Browse upcoming combat sports events and open fight slots.
            </motion.p>

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
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-lg bg-card animate-pulse" />
                ))}
              </div>
            ) : events && events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event, i) => {
                  const openSlots = event.fight_slots?.filter((s: any) => s.status === "open").length ?? 0;
                  const confirmedFights = event.fight_slots?.filter((s: any) => s.status === "confirmed").length ?? 0;
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.08 }}
                    >
                      <Link
                        to={`/events/${event.id}`}
                        className="flex flex-col md:flex-row md:items-center justify-between rounded-lg border border-border bg-card p-6 hover:gold-border-subtle transition-all duration-250 block"
                      >
                        <div className="flex-1">
                          <h3 className="font-heading text-xl text-foreground">{event.title}</h3>
                          <p className="text-sm text-muted-foreground">{event.promotion_name}</p>
                          <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {event.location}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 mt-4 md:mt-0">
                          <div className="text-right">
                            <span className="block text-primary font-semibold text-sm">{openSlots} open</span>
                            <span className="block text-xs text-muted-foreground">{confirmedFights} confirmed</span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">No events found.</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Events;
