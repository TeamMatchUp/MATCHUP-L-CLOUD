import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { MapPin, Calendar, ArrowLeft, ExternalLink, Ticket, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PutForwardFightersDialog } from "@/components/coach/PutForwardFightersDialog";

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super lightweight",
  welterweight: "Welterweight", super_welterweight: "Super welterweight", middleweight: "Middleweight",
  super_middleweight: "Super middleweight", light_heavyweight: "Light heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super heavyweight",
};

const SLOT_STATUS_CLASS: Record<string, string> = {
  open: "mu-pill mu-pill-open",
  proposed: "mu-pill mu-pill-proposed",
  confirmed: "mu-pill mu-pill-confirmed",
  cancelled: "mu-pill mu-pill-pending",
};

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, effectiveRoles } = useAuth();
  const isFighter = effectiveRoles.includes("fighter");
  const isCoach = effectiveRoles.includes("coach");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPutForward, setShowPutForward] = useState(false);
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: fighterProfile } = useQuery({
    queryKey: ["my-fighter-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fighter_profiles")
        .select("id, name")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && isFighter,
  });

  const { data: existingInterest } = useQuery({
    queryKey: ["fighter-event-interest", fighterProfile?.id, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fighter_event_interests")
        .select("id")
        .eq("fighter_id", fighterProfile!.id)
        .eq("event_id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!fighterProfile && !!id,
  });

  const handleConfirmInterest = async () => {
    if (!fighterProfile || !event) return;
    setSending(true);
    try {
      const { error: insertError } = await supabase
        .from("fighter_event_interests")
        .insert({ fighter_id: fighterProfile.id, event_id: id! });
      if (insertError) throw insertError;

      const { data: gymLinks } = await supabase
        .from("fighter_gym_links")
        .select("gym_id, gyms(coach_id)")
        .eq("fighter_id", fighterProfile.id)
        .eq("status", "accepted");

      const coachIds = new Set<string>();
      (gymLinks ?? []).forEach((link: any) => {
        if (link.gyms?.coach_id) coachIds.add(link.gyms.coach_id);
      });

      for (const coachId of coachIds) {
        await supabase.rpc("create_notification", {
          _user_id: coachId,
          _title: `${fighterProfile.name} is interested in an event`,
          _message: `${fighterProfile.name} is interested in "${event.title}" on ${new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`,
          _type: "event_update",
          _reference_id: id!,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["fighter-event-interest", fighterProfile.id, id] });
      queryClient.invalidateQueries({ queryKey: ["fighter-event-interests"] });
      toast.success("Your interest has been registered and your coach has been notified.");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSending(false);
      setShowConfirm(false);
    }
  };

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, fight_slots(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["event-tickets-public", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("event_id", id!)
        .order("price");
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!event?.ticket_enabled,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--mu-bg)]">
        <Header />
        <main className="pt-16">
          <div className="container py-16">
            <div className="h-8 w-64 bg-[var(--mu-sur)] animate-pulse rounded-mu-md mb-4" />
            <div className="h-4 w-48 bg-[var(--mu-sur)] animate-pulse rounded-mu-md" />
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[var(--mu-bg)]">
        <Header />
        <main className="pt-16">
          <div className="container py-16 text-center">
            <h1 className="text-2xl font-medium text-[var(--mu-t1)] mb-4">Event not found</h1>
            <button className="mu-btn-ghost inline-flex items-center gap-2" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />Back
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const openSlots = event.fight_slots?.filter((s: any) => s.status === "open") ?? [];
  const confirmedSlots = event.fight_slots?.filter((s: any) => s.status === "confirmed") ?? [];

  // Group by card position
  const mainCard = event.fight_slots?.filter((s: any) => s.card_position === "main") ?? [];
  const underCard = event.fight_slots?.filter((s: any) => s.card_position !== "main") ?? [];

  return (
    <div className="min-h-screen bg-[var(--mu-bg)]">
      <Header />
      <main className="pt-16">
        <section className="py-10 md:py-16">
          <div className="container">
            <button className="mu-btn-inline mb-6" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-3.5 w-3.5" />Back
            </button>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-2xl md:text-4xl font-medium text-[var(--mu-t1)] mb-2">{event.title}</h1>
              <p className="text-[var(--mu-t2)] mb-4">{event.promotion_name}</p>

              <div className="flex flex-wrap gap-4 mb-6">
                <span className="mu-pill mu-pill-published">
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </span>
              </div>

              <div className="flex flex-wrap gap-6 text-sm text-[var(--mu-t3)] mb-8">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(event.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </span>
              </div>

              {event.description && (
                <p className="text-[var(--mu-t2)] max-w-2xl mb-8 text-sm">{event.description}</p>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 mb-8">
                {isFighter && fighterProfile && (
                  existingInterest ? (
                    <span className="mu-btn-secondary inline-flex items-center gap-2 cursor-default opacity-70">
                      <Star className="h-4 w-4 fill-[var(--mu-gold)]" />
                      Interested
                    </span>
                  ) : (
                    <button
                      className="mu-btn-secondary inline-flex items-center gap-2"
                      onClick={() => setShowConfirm(true)}
                    >
                      <Star className="h-4 w-4" />
                      I'm interested
                    </button>
                  )
                )}

                {isCoach && user && (
                  <button
                    className="mu-btn-ghost inline-flex items-center gap-2"
                    onClick={() => setShowPutForward(true)}
                  >
                    <Users className="h-4 w-4" />
                    Put forward fighters
                  </button>
                )}
              </div>

              {/* Location Map */}
              <div className="mu-card overflow-hidden mb-8">
                <iframe
                  title="Event Location"
                  width="100%"
                  height="250"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    [event.venue_name, event.location, event.city, event.country].filter(Boolean).join(", ")
                  )}&output=embed&z=14`}
                />
                <div className="px-4 py-3 flex items-center gap-2 text-sm text-[var(--mu-t2)]">
                  <MapPin className="h-4 w-4 text-[var(--mu-gold)]" />
                  {[event.venue_name, event.location, event.city].filter(Boolean).join(", ")}
                </div>
              </div>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
              {[
                { label: "Total slots", value: event.fight_slots?.length ?? 0 },
                { label: "Open", value: openSlots.length },
                { label: "Confirmed", value: confirmedSlots.length },
                { label: "Country", value: event.country },
              ].map((stat) => (
                <div key={stat.label} className={`mu-card p-4 text-center ${
                  stat.label === "Confirmed" && typeof stat.value === "number" && stat.value > 0 ? "border-[var(--mu-gold-b)]" : ""
                }`}>
                  <p className="mu-section-label mb-1">{stat.label}</p>
                  <p className={`font-heading text-2xl ${
                    stat.label === "Confirmed" && typeof stat.value === "number" && stat.value > 0
                      ? "text-[var(--mu-gold)]"
                      : "text-[var(--mu-t1)]"
                  }`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Tickets */}
            {event.ticket_enabled && tickets.length > 0 && (
              <>
                <h2 className="text-lg font-medium text-[var(--mu-t1)] mb-4">
                  <Ticket className="inline h-5 w-5 mr-2 text-[var(--mu-gold)]" />
                  Tickets <span className="text-[var(--mu-gold)]">available</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                  {tickets.map((ticket: any) => (
                    <div key={ticket.id} className="mu-card p-5 flex flex-col">
                      <span className="mu-pill mu-pill-open self-start mb-3">{ticket.ticket_type}</span>
                      {ticket.price != null && (
                        <p className="font-heading text-3xl text-[var(--mu-t1)] mb-1">
                          £{Number(ticket.price).toFixed(2)}
                        </p>
                      )}
                      {ticket.quantity_available != null && (
                        <p className="text-xs text-[var(--mu-t3)] mb-4">
                          {ticket.quantity_available} available
                        </p>
                      )}
                      {ticket.external_link ? (
                        <a
                          href={ticket.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mu-btn-primary mt-auto inline-flex items-center justify-center gap-2 w-full text-center"
                        >
                          <ExternalLink className="h-4 w-4" /> Buy tickets
                        </a>
                      ) : (
                        <span className="mu-btn-ghost mt-auto inline-flex items-center justify-center gap-2 w-full text-center opacity-50 cursor-default">
                          <Ticket className="h-4 w-4" /> Coming soon
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Fight Card */}
            <h2 className="text-lg font-medium text-[var(--mu-t1)] mb-4">
              Fight <span className="text-[var(--mu-gold)]">card</span>
            </h2>
            {event.fight_slots && event.fight_slots.length > 0 ? (
              <div className="space-y-2">
                {event.fight_slots
                  .sort((a: any, b: any) => a.slot_number - b.slot_number)
                  .map((slot: any) => (
                    <div
                      key={slot.id}
                      className="mu-card flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-[var(--mu-t3)] text-sm font-medium w-8">#{slot.slot_number}</span>
                        <div>
                          <p className="text-sm font-medium text-[var(--mu-t1)]">{WEIGHT_CLASS_LABELS[slot.weight_class]}</p>
                        </div>
                      </div>
                      <span className={SLOT_STATUS_CLASS[slot.status] ?? "mu-pill mu-pill-pending"}>
                        {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-[var(--mu-t3)]">No fight slots defined yet.</p>
            )}
          </div>
        </section>
      </main>

      {/* Interest Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm interest</AlertDialogTitle>
            <AlertDialogDescription>
              A notification will be sent to your coach letting them know you're interested in this event. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmInterest} disabled={sending}>
              {sending ? "Sending..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isCoach && user && event && (
        <PutForwardFightersDialog
          open={showPutForward}
          onOpenChange={setShowPutForward}
          coachId={user.id}
          eventId={id!}
          eventTitle={event.title}
        />
      )}

      <Footer />
    </div>
  );
}
