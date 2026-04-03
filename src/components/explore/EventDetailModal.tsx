import { X, MapPin, Calendar, Phone, Clock } from "lucide-react";
import { useEffect, useRef } from "react";
import { Map as PigeonMap, Marker } from "pigeon-maps";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

function unwrap<T>(val: T | T[] | null | undefined): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val ?? null;
}

interface EventDetailModalProps {
  eventId: string;
  onClose: () => void;
}

export function EventDetailModal({ eventId, onClose }: EventDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const { data: event, isLoading } = useQuery({
    queryKey: ["explore-event-detail", eventId],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").eq("id", eventId).single();
      return data;
    },
    enabled: !!eventId,
  });

  const { data: bouts = [] } = useQuery({
    queryKey: ["explore-event-bouts", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("event_fight_slots")
        .select("*, fighter_a:fighter_profiles!event_fight_slots_fighter_a_id_fkey(id, name, record_wins, record_losses, record_draws), fighter_b:fighter_profiles!event_fight_slots_fighter_b_id_fkey(id, name, record_wins, record_losses, record_draws)")
        .eq("event_id", eventId)
        .eq("is_public", true)
        .eq("status", "confirmed")
        .order("slot_number");
      return data ?? [];
    },
    enabled: !!eventId,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const hasCoords = event?.latitude != null && event?.longitude != null;
  const mainEvents = bouts.filter((b: any) => b.bout_type === "Main Event");
  const undercards = bouts.filter((b: any) => b.bout_type !== "Main Event");

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
            <div className="h-8 w-48 bg-[#1a1e28] animate-pulse rounded mx-auto" />
          </div>
        ) : event ? (
          <>
            {/* Hero */}
            <div style={{ position: "relative", height: 220, overflow: "hidden" }}>
              <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1a1e28, #14171e)" }}>
                <Calendar className="h-16 w-16" style={{ color: "#555b6b" }} />
              </div>
              <div className="absolute inset-0" style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 40%, rgba(20,23,30,0.92) 80%, rgba(20,23,30,1) 100%)",
              }} />
              <h2 className="absolute bottom-6 left-6" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#e8eaf0", textTransform: "uppercase" }}>
                {event.title}
              </h2>
              {event.description && (
                <p className="absolute bottom-2 left-6" style={{ fontSize: 13, color: "#8b909e" }}>{event.description?.slice(0, 80)}</p>
              )}
              <button onClick={onClose} className="absolute top-4 right-4 flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.5)" }}>
                <X className="h-4 w-4" style={{ color: "#e8eaf0" }} />
              </button>
            </div>

            {/* Two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ padding: 24 }}>
              <div>
                <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15, color: "#e8eaf0", marginBottom: 12 }}>Event Details</h3>
                <div style={{ background: "#1a1e28", borderRadius: 8, padding: 16 }}>
                  <div className="flex items-start gap-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <Calendar className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#e8a020" }} />
                    <div>
                      <span style={{ fontSize: 11, color: "#8b909e", textTransform: "uppercase" }}>Date</span>
                      <p style={{ fontSize: 13, color: "#e8eaf0" }}>
                        {new Date(event.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <Clock className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#e8a020" }} />
                    <div>
                      <span style={{ fontSize: 11, color: "#8b909e", textTransform: "uppercase" }}>Time</span>
                      <p style={{ fontSize: 13, color: "#e8eaf0" }}>
                        {new Date(event.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  {(event.venue_name || event.location) && (
                    <div className="flex items-start gap-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#e8a020" }} />
                      <div>
                        <span style={{ fontSize: 11, color: "#8b909e", textTransform: "uppercase" }}>Venue</span>
                        <p style={{ fontSize: 13, color: "#e8eaf0" }}>{[event.venue_name, event.location, event.city].filter(Boolean).join(", ")}</p>
                      </div>
                    </div>
                  )}
                  {event.contact_phone && (
                    <div className="flex items-start gap-3 py-2">
                      <Phone className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#e8a020" }} />
                      <div>
                        <span style={{ fontSize: 11, color: "#8b909e", textTransform: "uppercase" }}>Phone</span>
                        <p style={{ fontSize: 13, color: "#e8eaf0" }}>{event.contact_phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15, color: "#e8eaf0", marginBottom: 12 }}>Venue Location</h3>
                <div style={{ background: "#1a1e28", borderRadius: 8, overflow: "hidden", height: 200 }}>
                  {hasCoords ? (
                    <PigeonMap defaultCenter={[event.latitude!, event.longitude!]} defaultZoom={14} height={200}>
                      <Marker anchor={[event.latitude!, event.longitude!]} color="#e8a020" width={32} />
                    </PigeonMap>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="h-8 w-8" style={{ color: "#555b6b" }} />
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#e8eaf0", marginTop: 8 }}>
                  {event.venue_name || event.location}
                </p>
              </div>
            </div>

            {/* Fight Card */}
            {bouts.length > 0 && (
              <div style={{ padding: "0 24px 24px" }}>
                <h3 style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15, color: "#e8eaf0", marginBottom: 12 }}>Fight Card</h3>
                {mainEvents.map((bout: any) => {
                  const fA = unwrap(bout.fighter_a);
                  const fB = unwrap(bout.fighter_b);
                  return (
                    <div key={bout.id} className="mb-3">
                      <span
                        style={{
                          background: "rgba(232,160,32,0.15)",
                          color: "#e8a020",
                          borderRadius: 9999,
                          padding: "3px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          marginBottom: 8,
                          display: "inline-block",
                        }}
                      >
                        MAIN EVENT
                      </span>
                      <div className="flex items-center justify-center gap-4 py-3">
                        <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 16, color: "#e8eaf0" }}>
                          {fA?.name ?? "TBA"}
                        </span>
                        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#e8a020" }}>VS</span>
                        <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 16, color: "#e8eaf0" }}>
                          {fB?.name ?? "TBA"}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {undercards.map((bout: any) => {
                  const fA = unwrap(bout.fighter_a);
                  const fB = unwrap(bout.fighter_b);
                  return (
                    <div key={bout.id} className="flex items-center justify-center gap-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#e8eaf0" }}>{fA?.name ?? "TBA"}</span>
                      <span style={{ fontSize: 13, color: "#555b6b" }}>vs</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#e8eaf0" }}>{fB?.name ?? "TBA"}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center" style={{ color: "#8b909e" }}>Event not found.</div>
        )}
      </div>
    </div>
  );
}
