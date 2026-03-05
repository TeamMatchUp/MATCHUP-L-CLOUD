import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link } from "react-router-dom";

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

export default function GymDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: gym, isLoading } = useQuery({
    queryKey: ["gym", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gyms")
        .select("*, fighter_gym_links(fighter_id, is_primary, fighter_profiles(id, name, weight_class, style, record_wins, record_losses, record_draws, available))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16">
          <div className="container py-16">
            <div className="h-8 w-64 bg-card animate-pulse rounded mb-4" />
          </div>
        </main>
      </div>
    );
  }

  if (!gym) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16">
          <div className="container py-16 text-center">
            <h1 className="font-heading text-3xl text-foreground mb-4">Gym Not Found</h1>
            <Button variant="ghost" asChild>
              <Link to="/gyms"><ArrowLeft className="h-4 w-4 mr-2" />Back to Gyms</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const fighters = gym.fighter_gym_links?.map((l: any) => l.fighter_profiles).filter(Boolean) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container max-w-3xl">
            <Button variant="ghost" size="sm" asChild className="mb-6">
              <Link to="/gyms"><ArrowLeft className="h-4 w-4 mr-2" />All Gyms</Link>
            </Button>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-start gap-6 mb-8">
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center font-heading text-xl text-muted-foreground shrink-0">
                  {gym.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <h1 className="font-heading text-3xl md:text-4xl text-foreground">{gym.name}</h1>
                  {gym.location && (
                    <p className="text-muted-foreground flex items-center gap-2 mt-2">
                      <MapPin className="h-4 w-4" />{gym.location}
                    </p>
                  )}
                </div>
              </div>

              {gym.description && (
                <div className="mb-8">
                  <p className="text-muted-foreground leading-relaxed">{gym.description}</p>
                </div>
              )}

              {/* Fighter Roster */}
              <h2 className="font-heading text-2xl text-foreground mb-4">
                FIGHTER <span className="text-primary">ROSTER</span>
              </h2>
              {fighters.length > 0 ? (
                <div className="space-y-3">
                  {fighters.map((fighter: any) => {
                    const record = `${fighter.record_wins}-${fighter.record_losses}-${fighter.record_draws}`;
                    return (
                      <Link
                        key={fighter.id}
                        to={`/fighters/${fighter.id}`}
                        className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:gold-border-subtle transition-all block"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-heading text-sm text-muted-foreground">
                            {fighter.name.split(" ").filter((n: string) => !n.startsWith('"')).map((n: string) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{fighter.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {WEIGHT_CLASS_LABELS[fighter.weight_class]} · {fighter.style ? STYLE_LABELS[fighter.style] : "—"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-primary font-bold text-sm">{record}</p>
                          <span className={`text-xs ${fighter.available ? "text-success" : "text-muted-foreground"}`}>
                            {fighter.available ? "Available" : "Booked"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">No fighters registered at this gym yet.</p>
              )}
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
