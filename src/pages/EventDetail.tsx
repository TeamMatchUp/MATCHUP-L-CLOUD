import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { MapPin, Calendar, ArrowLeft, ExternalLink, Ticket, Star, Users, Sparkles, Plus, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
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
import { ClaimEventDialog } from "@/components/organiser/ClaimEventDialog";

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

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, effectiveRoles } = useAuth();
  const isFighter = effectiveRoles.includes("fighter");
  const isCoach = effectiveRoles.includes("coach");
  const isOrganiser = effectiveRoles.includes("organiser");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPutForward, setShowPutForward] = useState(false);
  const [showClaimEvent, setShowClaimEvent] = useState(false);
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Get fighter profile for the current user
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

  // Check if already interested
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
        .eq("status", "approved");

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
      toast.success("Your interest has been registered and your coach has been notified!");
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

  // Confirmed fight slots with fighter names
  const { data: confirmedBouts = [] } = useQuery({
    queryKey: ["event-confirmed-bouts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_fight_slots")
        .select("*, fighter_a:fighter_profiles!event_fight_slots_fighter_a_id_fkey(id, name, record_wins, record_losses, record_draws, weight_class), fighter_b:fighter_profiles!event_fight_slots_fighter_b_id_fkey(id, name, record_wins, record_losses, record_draws, weight_class)")
        .eq("event_id", id!)
        .eq("status", "confirmed")
        .order("slot_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
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
            <div className="h-4 w-48 bg-card animate-pulse rounded" />
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16">
          <div className="container py-16 text-center">
            <h1 className="font-heading text-3xl text-foreground mb-4">Event Not Found</h1>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const mainEvents = confirmedBouts.filter((b: any) => b.bout_type === "Main Event");
  const undercards = confirmedBouts.filter((b: any) => b.bout_type !== "Main Event");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container">
            <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Button>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="font-heading text-4xl md:text-5xl text-foreground mb-2">{event.title}</h1>
              <p className="text-lg text-muted-foreground mb-4">{event.promotion_name}</p>

              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground mb-8">
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
                <p className="text-muted-foreground max-w-2xl mb-8">{event.description}</p>
              )}

              {/* Role action buttons */}
              <div className="flex flex-wrap gap-3 mb-8">
                {isFighter && fighterProfile && (
                  existingInterest ? (
                    <Button variant="outline" className="gap-2 border-primary/50 text-primary cursor-default" disabled>
                      <Star className="h-4 w-4 fill-primary" /> Interested
                    </Button>
                  ) : (
                    <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => setShowConfirm(true)}>
                      <Star className="h-4 w-4" /> I'm Interested
                    </Button>
                  )
                )}
                {isCoach && user && (
                  <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => setShowPutForward(true)}>
                    <Users className="h-4 w-4" /> Put Forward Fighters
                  </Button>
                )}
                {isOrganiser && user && event.organiser_id === user.id && (
                  <Button className="gap-2" asChild>
                    <Link to={`/events/${id}/matchmaking`}>
                      <Sparkles className="h-4 w-4" /> Get Match Suggestions
                    </Link>
                  </Button>
                )}
              </div>

              {/* Map */}
              <div className="rounded-lg border border-border overflow-hidden mb-12">
                <iframe
                  title="Event Location"
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    [event.venue_name, event.location, event.city, event.country].filter(Boolean).join(", ")
                  )}&output=embed&z=14`}
                />
                <div className="bg-card px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  {[event.venue_name, event.location, event.city].filter(Boolean).join(", ")}
                </div>
              </div>
            </motion.div>

            {/* Tickets */}
            {event.ticket_enabled && tickets.length > 0 && (
              <>
                <h2 className="font-heading text-2xl text-foreground mb-6">
                  <Ticket className="inline h-5 w-5 mr-2 text-primary" />
                  TICKETS AVAILABLE
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-12">
                  {tickets.map((ticket: any) => (
                    <div key={ticket.id} className="rounded-lg border border-border bg-card p-5 flex flex-col">
                      <Badge variant="outline" className="self-start mb-3 text-xs">{ticket.ticket_type}</Badge>
                      {ticket.price != null && (
                        <p className="font-heading text-3xl text-foreground mb-1">
                          £{Number(ticket.price).toFixed(2)}
                        </p>
                      )}
                      {ticket.quantity_available != null && (
                        <p className="text-xs text-muted-foreground mb-4">
                          {ticket.quantity_available} available
                        </p>
                      )}
                      {ticket.external_link ? (
                        <Button asChild className="mt-auto gap-2 w-full">
                          <a href={ticket.external_link} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" /> Buy Tickets
                          </a>
                        </Button>
                      ) : (
                        <Button variant="outline" className="mt-auto gap-2 w-full" disabled>
                          <Ticket className="h-4 w-4" /> Coming Soon
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Fight Card — Head-to-head display */}
            <h2 className="font-heading text-2xl text-foreground mb-6">
              FIGHT <span className="text-primary">CARD</span>
            </h2>

            {confirmedBouts.length > 0 ? (
              <div className="space-y-8 mb-12">
                {/* Main Events */}
                {mainEvents.length > 0 && (
                  <div>
                    <Badge className="bg-primary/15 text-primary border-primary/30 mb-4">MAIN EVENT</Badge>
                    <div className="space-y-4">
                      {mainEvents.map((bout: any) => {
                        const fA = unwrap(bout.fighter_a);
                        const fB = unwrap(bout.fighter_b);
                        return (
                          <div key={bout.id} className="rounded-lg border-2 border-primary/30 bg-card p-6">
                            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                              {/* Fighter A */}
                              <div className="text-center">
                                <Link to={fA ? `/fighters/${fA.id}` : "#"} className="hover:text-primary transition-colors">
                                  <p className="font-heading text-xl text-foreground">{fA?.name ?? "TBA"}</p>
                                </Link>
                                {fA && (
                                  <p className="text-primary font-bold text-lg mt-1">
                                    {fA.record_wins}-{fA.record_losses}-{fA.record_draws}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {bout.weight_class ? WEIGHT_CLASS_LABELS[bout.weight_class] || bout.weight_class : ""}
                                </p>
                              </div>

                              <div className="flex flex-col items-center">
                                <Swords className="h-6 w-6 text-primary mb-1" />
                                <span className="font-heading text-primary text-lg">VS</span>
                              </div>

                              {/* Fighter B */}
                              <div className="text-center">
                                <Link to={fB ? `/fighters/${fB.id}` : "#"} className="hover:text-primary transition-colors">
                                  <p className="font-heading text-xl text-foreground">{fB?.name ?? "TBA"}</p>
                                </Link>
                                {fB && (
                                  <p className="text-primary font-bold text-lg mt-1">
                                    {fB.record_wins}-{fB.record_losses}-{fB.record_draws}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {bout.weight_class ? WEIGHT_CLASS_LABELS[bout.weight_class] || bout.weight_class : ""}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Undercard */}
                {undercards.length > 0 && (
                  <div>
                    <Badge variant="outline" className="mb-4">UNDERCARD</Badge>
                    <div className="space-y-2">
                      {undercards.map((bout: any) => {
                        const fA = unwrap(bout.fighter_a);
                        const fB = unwrap(bout.fighter_b);
                        return (
                          <div key={bout.id} className="rounded-lg border border-border bg-card p-4">
                            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                              <div className="text-right">
                                <Link to={fA ? `/fighters/${fA.id}` : "#"} className="hover:text-primary transition-colors">
                                  <p className="font-medium text-foreground text-sm">{fA?.name ?? "TBA"}</p>
                                </Link>
                                {fA && <p className="text-xs text-primary font-medium">{fA.record_wins}-{fA.record_losses}-{fA.record_draws}</p>}
                              </div>
                              <span className="font-heading text-primary text-xs">VS</span>
                              <div className="text-left">
                                <Link to={fB ? `/fighters/${fB.id}` : "#"} className="hover:text-primary transition-colors">
                                  <p className="font-medium text-foreground text-sm">{fB?.name ?? "TBA"}</p>
                                </Link>
                                {fB && <p className="text-xs text-primary font-medium">{fB.record_wins}-{fB.record_losses}-{fB.record_draws}</p>}
                              </div>
                            </div>
                            {bout.weight_class && (
                              <p className="text-center text-[10px] text-muted-foreground mt-1">
                                {WEIGHT_CLASS_LABELS[bout.weight_class] || bout.weight_class}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Fall back to fight_slots display if no confirmed bouts */
              event.fight_slots && event.fight_slots.length > 0 ? (
                <div className="space-y-3 mb-12">
                  {event.fight_slots
                    .sort((a: any, b: any) => a.slot_number - b.slot_number)
                    .map((slot: any) => (
                      <div key={slot.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                        <div className="flex items-center gap-4">
                          <span className="font-heading text-lg text-muted-foreground w-8">#{slot.slot_number}</span>
                          <p className="text-sm font-medium text-foreground">{WEIGHT_CLASS_LABELS[slot.weight_class]}</p>
                        </div>
                        <Badge className={slot.status === "open" ? "bg-primary/10 text-primary" : slot.status === "confirmed" ? "bg-success/10 text-success" : ""} variant="outline">
                          {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
                        </Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground mb-12">No fight slots defined yet.</p>
              )
            )}
          </div>
        </section>
      </main>

      {/* Interest Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Interest</AlertDialogTitle>
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

      {/* Coach Put Forward Dialog */}
      {isCoach && user && event && (
        <PutForwardFightersDialog
          open={showPutForward}
          onOpenChange={setShowPutForward}
          coachId={user.id}
          eventId={id!}
          eventTitle={event.title}
        />
      )}

      {/* Event Claim Banner */}
      {user && (isCoach || effectiveRoles.includes("organiser")) && event && !event.organiser_id && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3">
          <div className="container flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Are you the promoter of this event? <span className="text-foreground font-medium">Claim this listing</span> to manage it, add fight slots, and receive proposals.
            </p>
            <Button size="sm" onClick={() => setShowClaimEvent(true)}>Claim Event</Button>
          </div>
        </div>
      )}

      {showClaimEvent && event && (
        <ClaimEventDialog
          open={showClaimEvent}
          onOpenChange={setShowClaimEvent}
          eventId={id!}
          eventTitle={event.title}
        />
      )}

      <Footer />
    </div>
  );
}
