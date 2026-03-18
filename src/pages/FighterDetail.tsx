import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, ShieldCheck } from "lucide-react";
import { FightHistory } from "@/components/fighter/FightHistory";
import { ProfileCompletionBar } from "@/components/fighter/ProfileCompletionBar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

import { STYLE_LABELS } from "@/lib/format";

export default function FighterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: fighter, isLoading } = useQuery({
    queryKey: ["fighter", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fighter_profiles")
        .select("*, fighter_gym_links(gym_id, is_primary, gyms(id, name, location))")
        .eq("id", id!)
        .single();
      if (error) throw error;

      // Fetch avatar from linked user profile
      let avatarUrl: string | null = null;
      if (data.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", data.user_id)
          .single();
        avatarUrl = profile?.avatar_url || null;
      }

      return { ...data, _avatar: data.profile_image || avatarUrl || null };
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

  if (!fighter) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16">
          <div className="container py-16 text-center">
            <h1 className="font-heading text-3xl text-foreground mb-4">Fighter Not Found</h1>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Static record kept as fallback, but dynamic record from FightHistory will override visually
  const gyms = fighter.fighter_gym_links ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container max-w-3xl">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Button>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-start gap-6 mb-8">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center font-heading text-2xl text-muted-foreground shrink-0 overflow-hidden">
                  {fighter._avatar ? (
                    <img src={fighter._avatar} alt={fighter.name} className="h-full w-full object-cover" />
                  ) : (
                    fighter.name.split(" ").filter((n: string) => !n.startsWith('"')).map((n: string) => n[0]).join("").slice(0, 2)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-heading text-3xl md:text-4xl text-foreground">{fighter.name}</h1>
                    {fighter.verified && <ShieldCheck className="h-5 w-5 text-primary" />}
                  </div>
                  <FightHistory fighterId={fighter.id} />
                  <span className={`inline-block mt-2 text-xs font-medium px-3 py-1 rounded-full ${fighter.available ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {fighter.available ? "Available for fights" : "Currently booked"}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Weight Class", value: WEIGHT_CLASS_LABELS[fighter.weight_class] },
                  { label: "Style", value: fighter.style ? STYLE_LABELS[fighter.style] : "—" },
                  { label: "Height", value: fighter.height ?? "—" },
                  { label: "Reach", value: fighter.reach ?? "—" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="font-heading text-lg text-foreground mt-1">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Record Breakdown removed - now shown dynamically via FightHistory */}

              {/* Bio */}
              {fighter.bio && (
                <div className="mb-8">
                  <h2 className="font-heading text-xl text-foreground mb-3">ABOUT</h2>
                  <p className="text-muted-foreground leading-relaxed">{fighter.bio}</p>
                </div>
              )}

              {/* Gym Affiliations */}
              {gyms.length > 0 && (
                <div>
                  <h2 className="font-heading text-xl text-foreground mb-3">GYM AFFILIATIONS</h2>
                  <div className="space-y-3">
                    {gyms.map((link: any) => (
                      <Link
                        key={link.gym_id}
                        to={`/gyms/${link.gyms?.id}`}
                        className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:gold-border-subtle transition-all"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{link.gyms?.name}</p>
                          {link.gyms?.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />{link.gyms.location}
                            </p>
                          )}
                        </div>
                        {link.is_primary && (
                          <span className="text-xs text-primary font-medium">Primary</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
