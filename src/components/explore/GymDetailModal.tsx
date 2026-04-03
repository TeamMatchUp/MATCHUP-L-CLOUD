import { X, MapPin, Phone, Mail, Users, Calendar } from "lucide-react";
import { useEffect, useRef } from "react";
import { Map as PigeonMap, Marker } from "pigeon-maps";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface GymDetailModalProps {
  gymId: string;
  onClose: () => void;
}

export function GymDetailModal({ gymId, onClose }: GymDetailModalProps) {
  const { user } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);

  const { data: gym, isLoading } = useQuery({
    queryKey: ["explore-gym-detail", gymId],
    queryFn: async () => {
      const { data } = await supabase
        .from("gyms")
        .select("*, fighter_gym_links(id, fighter_id, is_primary, status, fighter_profiles(id, name))")
        .eq("id", gymId)
        .single();
      return data;
    },
    enabled: !!gymId,
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["explore-gym-events", gymId],
    queryFn: async () => {
      if (!gym?.fighter_gym_links) return [];
      const fighterIds = gym.fighter_gym_links
        .filter((l: any) => l.status === "approved")
        .map((l: any) => l.fighter_id);
      if (fighterIds.length === 0) return [];
      const { data: slots } = await supabase
        .from("event_fight_slots")
        .select("event_id, events(id, title, date)")
        .in("fighter_a_id", fighterIds)
        .limit(4);
      const unique = new Map();
      (slots ?? []).forEach((s: any) => {
        const e = Array.isArray(s.events) ? s.events[0] : s.events;
        if (e && !unique.has(e.id)) unique.set(e.id, e);
      });
      return Array.from(unique.values());
    },
    enabled: !!gym,
  });

  // Focus trap & escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const fighters = (gym?.fighter_gym_links ?? []).filter((l: any) => l.status === "approved");
  const hasCoords = gym?.lat != null && gym?.lng != null;
  const tags = gym?.discipline_tags ? gym.discipline_tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

  const handleRegisterInterest = async () => {
    if (!user || !gym) {
      toast.info("Log in to register interest");
      return;
    }
    await supabase.from("gym_leads").insert({
      gym_id: gym.id,
      name: user.email?.split("@")[0] || "User",
      email: user.email || "",
      user_id: user.id,
      type: "interest",
    });
    toast.success("Interest registered!");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
      style={{
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px) saturate(140%)",
      }}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="animate-in fade-in zoom-in-95 duration-200"
        style={{
          width: "min(880px, 95vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#14171e",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          scrollbarWidth: "thin" as any,
          scrollbarColor: "rgba(232,160,32,0.3) transparent",
        }}
      >
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-48 bg-[#1a1e28] animate-pulse rounded mx-auto mb-4" />
            <div className="h-4 w-32 bg-[#1a1e28] animate-pulse rounded mx-auto" />
          </div>
        ) : gym ? (
          <>
            {/* Hero */}
            <div style={{ position: "relative", height: 220, overflow: "hidden" }}>
              {gym.logo_url ? (
                <img src={gym.logo_url} alt={gym.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: "#1a1e28" }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 64, color: "#555b6b" }}>
                    {gym.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </span>
                </div>
              )}
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 40%, rgba(20,23,30,0.92) 80%, rgba(20,23,30,1) 100%)",
                }}
              />
              {tags.length > 0 && (
                <div className="absolute bottom-14 left-6 flex flex-wrap gap-1.5">
                  {tags.map((tag: string) => (
                    <span
                      key={tag}
                      style={{
                        background: "rgba(0,0,0,0.6)",
                        backdropFilter: "blur(6px)",
                        border: "1px solid rgba(232,160,32,0.25)",
                        color: "#e8a020",
                        borderRadius: 9999,
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <h2
                className="absolute bottom-6 left-6"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#e8eaf0" }}
              >
                {gym.name}
              </h2>
              {gym.description && (
                <p className="absolute bottom-2 left-6" style={{ fontSize: 13, color: "#8b909e" }}>
                  {gym.description?.slice(0, 80)}
                </p>
              )}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 flex items-center justify-center transition-colors"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.5)",
                }}
              >
                <X className="h-4 w-4" style={{ color: "#e8eaf0" }} />
              </button>
            </div>

            {/* Two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ padding: 24 }}>
              {/* Contact */}
              <div>
                <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15, color: "#e8eaf0", marginBottom: 12 }}>
                  Contact Information
                </h3>
                <div style={{ background: "#1a1e28", borderRadius: 8, padding: 16 }}>
                  {(gym.address || gym.location) && (
                    <div className="flex items-start gap-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#e8a020" }} />
                      <div>
                        <span style={{ fontSize: 11, color: "#8b909e", textTransform: "uppercase" }}>Address</span>
                        <p style={{ fontSize: 13, color: "#e8eaf0" }}>{gym.address || gym.location}</p>
                      </div>
                    </div>
                  )}
                  {gym.phone && (
                    <div className="flex items-start gap-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <Phone className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#e8a020" }} />
                      <div>
                        <span style={{ fontSize: 11, color: "#8b909e", textTransform: "uppercase" }}>Phone</span>
                        <p style={{ fontSize: 13, color: "#e8eaf0" }}>{gym.phone}</p>
                      </div>
                    </div>
                  )}
                  {gym.contact_email && (
                    <div className="flex items-start gap-3 py-2">
                      <Mail className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#e8a020" }} />
                      <div>
                        <span style={{ fontSize: 11, color: "#8b909e", textTransform: "uppercase" }}>Email</span>
                        <p style={{ fontSize: 13, color: "#e8eaf0" }}>{gym.contact_email}</p>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleRegisterInterest}
                  className="w-full mt-4 transition-all duration-200"
                  style={{
                    background: "#e8a020",
                    color: "#0d0f12",
                    borderRadius: 8,
                    padding: 13,
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                    border: "none",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#c47e10";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(232,160,32,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#e8a020";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  Register Interest
                </button>
              </div>

              {/* Location */}
              <div>
                <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15, color: "#e8eaf0", marginBottom: 12 }}>
                  Location
                </h3>
                <div style={{ background: "#1a1e28", borderRadius: 8, overflow: "hidden", height: 200 }}>
                  {hasCoords ? (
                    <PigeonMap defaultCenter={[gym.lat!, gym.lng!]} defaultZoom={14} height={200}>
                      <Marker anchor={[gym.lat!, gym.lng!]} color="#e8a020" width={32} />
                    </PigeonMap>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="h-8 w-8" style={{ color: "#555b6b" }} />
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0", marginTop: 8 }}>
                  {gym.city || gym.location || gym.name}
                </p>
                {hasCoords && (
                  <p style={{ fontSize: 11, color: "#8b909e" }}>
                    {gym.lat!.toFixed(4)}, {gym.lng!.toFixed(4)}
                  </p>
                )}
              </div>
            </div>

            {/* Fighter Roster */}
            {fighters.length > 0 && (
              <div style={{ padding: "0 24px 16px" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4" style={{ color: "#e8a020" }} />
                  <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15, color: "#e8eaf0" }}>
                    Fighter Roster
                  </h3>
                  <span
                    style={{
                      background: "rgba(34,197,94,0.15)",
                      color: "#22c55e",
                      borderRadius: 9999,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {fighters.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {fighters.map((link: any) => (
                    <div
                      key={link.id}
                      style={{
                        background: "#1a1e28",
                        borderRadius: 8,
                        padding: "12px 16px",
                      }}
                    >
                      <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: "#e8eaf0" }}>
                        {Array.isArray(link.fighter_profiles) ? link.fighter_profiles[0]?.name : link.fighter_profiles?.name}
                      </p>
                      <p style={{ fontSize: 11, color: "#8b909e" }}>Active Fighter</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div style={{ padding: "0 24px 24px" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4" style={{ color: "#e8a020" }} />
                  <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15, color: "#e8eaf0" }}>
                    Upcoming Events
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {upcomingEvents.map((evt: any) => (
                    <div
                      key={evt.id}
                      className="transition-all duration-200 hover:bg-[rgba(232,160,32,0.1)] hover:border-[rgba(232,160,32,0.35)]"
                      style={{
                        background: "#1a1e28",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 8,
                        padding: "12px 16px",
                      }}
                    >
                      <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: "#e8eaf0" }}>{evt.title}</p>
                      <p style={{ fontSize: 11, color: "#8b909e" }}>Team competing</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center" style={{ color: "#8b909e" }}>Gym not found.</div>
        )}
      </div>
    </div>
  );
}
