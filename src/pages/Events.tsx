import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BannerAd } from "@/components/BannerAd";
import iconImg from "@/assets/icon-gold.webp";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Calendar, ArrowRight, Filter, Search, Ticket, Swords, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import React from "react";
import type { Database } from "@/integrations/supabase/types";
import { usePostcodeSearch, haversineDistance } from "@/hooks/use-postcode-search";

type CountryCode = Database["public"]["Enums"]["country_code"];

const Events = () => {
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketsOnly, setTicketsOnly] = useState(false);
  const [unmatchedOnly, setUnmatchedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const pc = usePostcodeSearch();

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", countryFilter],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("*, fight_slots(*), tickets(*)")
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

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((event) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          event.title.toLowerCase().includes(q) ||
          event.promotion_name?.toLowerCase().includes(q) ||
          event.location?.toLowerCase().includes(q) ||
          event.venue_name?.toLowerCase().includes(q) ||
          event.city?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (pc.coords && event.latitude != null && event.longitude != null) {
        const dist = haversineDistance(pc.coords.latitude, pc.coords.longitude, event.latitude, event.longitude);
        if (dist > pc.radius) return false;
      }
      if (ticketsOnly) {
        if (!event.tickets || event.tickets.length === 0) return false;
      }
      if (unmatchedOnly) {
        const openSlots = event.fight_slots?.filter((s: any) => s.status === "open").length ?? 0;
        if (openSlots === 0) return false;
      }
      return true;
    });
  }, [events, searchQuery, pc.coords, pc.radius, ticketsOnly, unmatchedOnly]);

  return (
    <div className="min-h-screen bg-[var(--mu-bg)]">
      <Header />
      <main className="pt-16">
        <section className="py-10 md:py-16">
          <div className="container">
            <motion.h1
              className="text-3xl md:text-5xl font-medium text-[var(--mu-t1)] mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              All <span className="text-[var(--mu-gold)]">events</span>
            </motion.h1>
            <motion.p
              className="text-[var(--mu-t3)] text-mu-md mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Browse upcoming combat sports events and open fight slots.
            </motion.p>

            {/* Search & Filters */}
            <div className="space-y-3 mb-8">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--mu-t3)]" />
                  <input
                    placeholder="Search events, promotions, venues..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mu-input pl-9"
                  />
                </div>
                <button
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className={`mu-card flex items-center justify-center w-10 h-10 shrink-0 cursor-pointer transition-colors duration-150 ${
                    filtersOpen ? "border-[var(--mu-gold-b)]" : ""
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4 text-[var(--mu-t2)]" />
                </button>
              </div>

              <AnimatePresence>
                {filtersOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mu-card p-3 sm:p-4 space-y-4">
                      <div className="flex flex-wrap gap-3 items-center">
                        <Select value={countryFilter} onValueChange={setCountryFilter}>
                          <SelectTrigger className="w-[140px] sm:w-[160px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All countries</SelectItem>
                            <SelectItem value="UK">UK</SelectItem>
                            <SelectItem value="USA">USA</SelectItem>
                            <SelectItem value="AUS">Australia</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2">
                          <Switch id="tickets-filter" checked={ticketsOnly} onCheckedChange={setTicketsOnly} />
                          <Label htmlFor="tickets-filter" className="text-xs text-[var(--mu-t2)] flex items-center gap-1 cursor-pointer">
                            <Ticket className="h-3.5 w-3.5" /> Tickets
                          </Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch id="unmatched-filter" checked={unmatchedOnly} onCheckedChange={setUnmatchedOnly} />
                          <Label htmlFor="unmatched-filter" className="text-xs text-[var(--mu-t2)] flex items-center gap-1 cursor-pointer">
                            <Swords className="h-3.5 w-3.5" /> Open slots
                          </Label>
                        </div>
                      </div>

                      {/* Postcode radius search */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[var(--mu-t3)] shrink-0" />
                          <span className="mu-section-label mb-0">Location search</span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            placeholder="Enter UK postcode..."
                            value={pc.postcode}
                            onChange={(e) => pc.setPostcode(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && pc.lookup()}
                            className="mu-input flex-1"
                          />
                          <button className="mu-btn-primary" onClick={pc.lookup} disabled={pc.isGeocoding || !pc.postcode.trim()}>
                            {pc.isGeocoding ? "..." : "Search"}
                          </button>
                          {pc.coords && (
                            <button className="mu-btn-ghost" onClick={pc.clear}>
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {pc.error && <p className="text-xs text-destructive">{pc.error}</p>}
                        {pc.coords && (
                          <div className="space-y-2">
                            <span className="text-xs text-[var(--mu-t2)]">
                              Within <span className="text-[var(--mu-t1)] font-medium">{pc.radius} miles</span> of {pc.coords.postcode}
                            </span>
                            <Slider
                              value={[pc.radius]}
                              onValueChange={([v]) => pc.setRadius(v)}
                              min={1}
                              max={100}
                              step={1}
                              className="w-full"
                            />
                            <div className="flex justify-between text-[10px] text-[var(--mu-t3)]">
                              <span>1 mi</span>
                              <span>100 mi</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Count label */}
            {!isLoading && (
              <p className="mu-section-label mb-4">
                {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""} found
              </p>
            )}

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-mu-lg bg-[var(--mu-sur)] animate-pulse" />
                ))}
              </div>
            ) : filteredEvents.length > 0 ? (
              <div className="space-y-3">
                {filteredEvents.map((event, i) => {
                  const openSlots = event.fight_slots?.filter((s: any) => s.status === "open").length ?? 0;
                  const confirmedFights = event.fight_slots?.filter((s: any) => s.status === "confirmed").length ?? 0;
                  const hasTickets = event.tickets && event.tickets.length > 0;
                  return (
                    <React.Fragment key={event.id}>
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.08 }}
                      >
                        <Link
                          to={`/events/${event.id}`}
                          className={`mu-card block p-4 md:p-6 hover:border-[var(--mu-gold-b)] transition-all duration-150 ${
                            openSlots > 0 ? "mu-card-featured" : ""
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between">
                            <div className="flex-1">
                              <h3 className="text-[var(--mu-t1)] font-medium text-base">{event.title}</h3>
                              <p className="text-mu-md text-[var(--mu-t2)]">{event.promotion_name}</p>
                              <div className="flex flex-wrap gap-4 mt-2 text-xs text-[var(--mu-t3)]">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {event.city ? `${event.city}, ${event.location}` : event.location}
                                </span>
                                {hasTickets && (
                                  <span className="flex items-center gap-1 text-[var(--mu-gold)] text-[10px]">
                                    <Ticket className="h-3.5 w-3.5" /> Tickets available
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-6 mt-4 md:mt-0">
                              <div className="text-right">
                                <span className="block text-[var(--mu-gold)] font-medium text-[13px]">{openSlots} open</span>
                                <span className="block text-xs text-[var(--mu-t3)]">{confirmedFights} confirmed</span>
                              </div>
                              <ArrowRight className="h-4 w-4 text-[var(--mu-t3)]" />
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                      {(i + 1) % 5 === 0 && <BannerAd />}
                    </React.Fragment>
                  );
                })}
                {filteredEvents.length < 5 && <BannerAd />}
                <motion.div
                  className="flex justify-center py-12"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <Link
                    to="/auth"
                    className="mu-btn-secondary inline-flex items-center gap-3"
                  >
                    <img src={iconImg} alt="" className="h-5 w-5" />
                    Register your event
                  </Link>
                </motion.div>
              </div>
            ) : (
              <p className="text-[var(--mu-t3)] text-center py-12">No events found matching your filters.</p>
            )}
            {filteredEvents.length === 0 && !isLoading && (
              <motion.div
                className="flex justify-center py-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Link
                  to="/auth"
                  className="mu-btn-secondary inline-flex items-center gap-3"
                >
                  <img src={iconImg} alt="" className="h-5 w-5" />
                  Register your event
                </Link>
              </motion.div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Events;
