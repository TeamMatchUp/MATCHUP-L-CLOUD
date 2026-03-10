import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Filter, Users, ShieldCheck, Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";
import { usePostcodeSearch, haversineDistance } from "@/hooks/use-postcode-search";

type CountryCode = Database["public"]["Enums"]["country_code"];

export default function Gyms() {
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const pc = usePostcodeSearch();

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

  const filteredGyms = useMemo(() => {
    if (!gyms) return [];
    return gyms.filter((gym) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          gym.name.toLowerCase().includes(q) ||
          gym.location?.toLowerCase().includes(q) ||
          gym.city?.toLowerCase().includes(q) ||
          gym.address?.toLowerCase().includes(q) ||
          gym.description?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (pc.coords && (gym as any).latitude != null && (gym as any).longitude != null) {
        const dist = haversineDistance(pc.coords.latitude, pc.coords.longitude, (gym as any).latitude, (gym as any).longitude);
        if (dist > pc.radius) return false;
      }
      // Items without coords are kept so results still show
      return true;
    });
  }, [gyms, searchQuery, pc.coords, pc.radius]);

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

            {/* Search & Filters */}
            <div className="space-y-3 mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search gyms by name, location..."
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 rounded-lg bg-card animate-pulse" />
                ))}
              </div>
            ) : filteredGyms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredGyms.map((gym, i) => (
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
                      {(gym.city || gym.location) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                          <MapPin className="h-3 w-3" />
                          {gym.city ? `${gym.city}, ${gym.location || gym.country}` : gym.location}
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
              <p className="text-muted-foreground text-center py-12">No gyms found matching your filters.</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
