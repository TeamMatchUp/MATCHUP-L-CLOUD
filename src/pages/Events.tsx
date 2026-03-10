import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BannerAd } from "@/components/BannerAd";
import iconImg from "@/assets/icon-gold.webp";
import { motion } from "framer-motion";
import { MapPin, Calendar, ArrowRight, Filter, Search, Ticket, Swords, X } from "lucide-react";
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
      // Items without coords are kept (not excluded) so results still show
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

            {/* Search & Filters */}
            <div className="space-y-3 mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events, promotions, venues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-[140px] sm:w-[160px]">
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

                <div className="flex items-center gap-2">
                  <Switch id="tickets-filter" checked={ticketsOnly} onCheckedChange={setTicketsOnly} />
                  <Label htmlFor="tickets-filter" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                    <Ticket className="h-3.5 w-3.5" /> Tickets
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch id="unmatched-filter" checked={unmatchedOnly} onCheckedChange={setUnmatchedOnly} />
                  <Label htmlFor="unmatched-filter" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                    <Swords className="h-3.5 w-3.5" /> Open Slots
                  </Label>
                </div>
              </div>

              {/* Postcode radius search */}
              <div className="rounded-lg border border-border bg-card p-3 sm:p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location Search</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter UK postcode..."
                    value={pc.postcode}
                    onChange={(e) => pc.setPostcode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && pc.lookup()}
                    className="flex-1 text-sm"
                  />
                  <Button size="sm" onClick={pc.lookup} disabled={pc.isGeocoding || !pc.postcode.trim()}>
                    {pc.isGeocoding ? "..." : "Search"}
                  </Button>
                  {pc.coords && (
                    <Button size="sm" variant="ghost" onClick={pc.clear}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {pc.error && <p className="text-xs text-destructive">{pc.error}</p>}
                {pc.coords && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Within <span className="text-foreground font-medium">{pc.radius} miles</span> of {pc.coords.postcode}
                      </span>
                    </div>
                    <Slider
                      value={[pc.radius]}
                      onValueChange={([v]) => pc.setRadius(v)}
                      min={1}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>1 mi</span>
                      <span>100 mi</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-lg bg-card animate-pulse" />
                ))}
              </div>
            ) : filteredEvents.length > 0 ? (
              <div className="space-y-4">
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
                                {event.city ? `${event.city}, ${event.location}` : event.location}
                              </span>
                              {hasTickets && (
                                <span className="flex items-center gap-1 text-primary">
                                  <Ticket className="h-3.5 w-3.5" /> Tickets Available
                                </span>
                              )}
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
                    className="inline-flex items-center gap-3 bg-muted hover:bg-muted/80 text-foreground font-medium text-sm px-8 py-3 rounded-full transition-colors duration-200"
                  >
                    <img src={iconImg} alt="" className="h-5 w-5" />
                    register your event
                  </Link>
                </motion.div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">No events found matching your filters.</p>
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
                  className="inline-flex items-center gap-3 bg-muted hover:bg-muted/80 text-foreground font-medium text-sm px-8 py-3 rounded-full transition-colors duration-200"
                >
                  <img src={iconImg} alt="" className="h-5 w-5" />
                  register your event
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
