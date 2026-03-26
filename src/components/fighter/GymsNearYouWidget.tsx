import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { MapPin, Navigation, Star } from "lucide-react";
import { geocodePostcode, haversineDistance } from "@/hooks/use-postcode-search";

interface GymsNearYouWidgetProps {
  fighterProfileId: string;
}

export function GymsNearYouWidget({ fighterProfileId }: GymsNearYouWidgetProps) {
  // Get fighter's postcode directly from fighter_profiles
  const { data: fighterPostcode } = useQuery({
    queryKey: ["fighter-postcode", fighterProfileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_profiles")
        .select("postcode")
        .eq("id", fighterProfileId)
        .single();
      return data?.postcode || null;
    },
    enabled: !!fighterProfileId,
  });

  const { data: nearbyGyms = [], isLoading } = useQuery({
    queryKey: ["gyms-near-fighter", fighterProfileId, fighterPostcode],
    queryFn: async () => {
      if (!fighterPostcode) return [];

      const coords = await geocodePostcode(fighterPostcode);
      if (!coords) return [];

      const { data: allGyms } = await supabase
        .from("gyms")
        .select("id, name, city, country, lat, lng, discipline_tags, listing_tier")
        .not("lat", "is", null)
        .not("lng", "is", null);

      if (!allGyms) return [];

      return allGyms
        .map((gym: any) => ({
          ...gym,
          distance: haversineDistance(coords.latitude, coords.longitude, gym.lat, gym.lng),
        }))
        .filter((gym) => gym.distance <= 20)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);
    },
    enabled: !!fighterProfileId && !!fighterPostcode,
  });

  // No postcode — show prompt only
  if (!fighterPostcode) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-heading text-sm text-foreground mb-3">
          GYMS <span className="text-primary">NEAR YOU</span>
        </h3>
        <div className="text-center py-4">
          <Navigation className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            Add your postcode to see nearby gyms
          </p>
          <Link to="/dashboard?section=my-profile" className="text-xs text-primary hover:underline mt-1 inline-block">
            Update profile →
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-heading text-sm text-foreground mb-3">GYMS NEAR YOU</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (nearbyGyms.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-heading text-sm text-foreground mb-3">
          GYMS <span className="text-primary">NEAR YOU</span>
        </h3>
        <p className="text-xs text-muted-foreground text-center py-4">No gyms found within 20 miles.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-heading text-sm text-foreground mb-3">
        GYMS <span className="text-primary">NEAR YOU</span>
      </h3>
      <div className="space-y-2">
        {nearbyGyms.map((gym: any) => (
          <Link
            key={gym.id}
            to={`/gyms/${gym.id}`}
            className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 hover:border-primary/30 transition-colors"
          >
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-foreground truncate">{gym.name}</p>
                {gym.listing_tier === "featured" && (
                  <Star className="h-3 w-3 text-primary fill-primary shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">{gym.city ?? gym.country}</p>
                <span className="text-xs text-primary font-medium">{gym.distance.toFixed(1)} mi</span>
              </div>
              {gym.discipline_tags && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {gym.discipline_tags.split(",").map((tag: string) => (
                    <span key={tag.trim()} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
