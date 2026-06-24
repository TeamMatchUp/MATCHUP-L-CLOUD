import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { MapPin, Star, LocateFixed } from "lucide-react";
import { haversineDistance } from "@/hooks/use-postcode-search";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface GymsNearYouWidgetProps {
  fighterProfileId: string;
}

export function GymsNearYouWidget({ fighterProfileId }: GymsNearYouWidgetProps) {
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("gyms-near-you-location");
    if (stored === "enabled") requestLocation();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationError(true); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationEnabled(true);
        setLocationError(false);
        sessionStorage.setItem("gyms-near-you-location", "enabled");
      },
      () => { setLocationError(true); setLocationEnabled(false); }
    );
  };

  const { data: nearbyGyms = [], isLoading } = useQuery({
    queryKey: ["gyms-near-fighter", fighterProfileId, userCoords?.lat, userCoords?.lng],
    queryFn: async () => {
      if (!userCoords) return [];
      const { data: allGyms } = await supabase
        .from("gyms")
        .select("id, name, city, country, lat, lng, discipline_tags, listing_tier")
        .not("lat", "is", null)
        .not("lng", "is", null);
      if (!allGyms) return [];
      return allGyms
        .map((gym: any) => ({ ...gym, distance: haversineDistance(userCoords.lat, userCoords.lng, gym.lat, gym.lng) }))
        .filter((gym) => gym.distance <= 20)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);
    },
    enabled: !!userCoords,
  });

  const heading = (
    <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(1.125rem, 4.5vw, 1.25rem)", color: "#e8eaf0", letterSpacing: "0.04em", marginBottom: 12, lineHeight: 1.1 }}>
      GYMS <span style={{ color: "#ef4444" }}>NEAR YOU</span>
    </h3>
  );

  if (!locationEnabled || !userCoords) {
    return (
      <div className="flex flex-col flex-1">
        {heading}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <LocateFixed style={{ width: 32, height: 32, color: "#555b6b", marginBottom: 8 }} />
          <p style={{ fontSize: 12, color: "#8b909e", marginBottom: 10 }}>
            {locationError ? "Location access was denied." : "Enable location to see nearby gyms"}
          </p>
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={requestLocation}>
            <LocateFixed className="h-3 w-3" /> Enable Location
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1">
        {heading}
        <div className="space-y-2">{[1, 2, 3].map((i) => (<div key={i} style={{ height: 56, background: "#181c24", borderRadius: 8 }} className="animate-pulse" />))}</div>
      </div>
    );
  }

  if (nearbyGyms.length === 0) {
    return (
      <div className="flex flex-col flex-1">
        {heading}
        <p style={{ fontSize: 12, color: "#8b909e", textAlign: "center", padding: "16px 0" }}>No gyms found within 20 miles.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {heading}
      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 280 }}>
        {nearbyGyms.map((gym: any) => (
          <Link
            key={gym.id}
            to={`/gyms/${gym.id}`}
            className="flex items-center gap-3 transition-colors"
            style={{ background: "#181c24", borderRadius: 8, padding: "10px 12px" }}
          >
            <div style={{ height: 36, width: 36, borderRadius: 8, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MapPin style={{ width: 16, height: 16, color: "#ef4444" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0" }}>{gym.name}</p>
                {gym.listing_tier === "featured" && <Star style={{ width: 12, height: 12, color: "#ef4444", fill: "#ef4444", flexShrink: 0 }} />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p style={{ fontSize: 11, color: "#8b909e" }}>{gym.city ?? gym.country}</p>
                <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>{gym.distance.toFixed(1)} mi</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
