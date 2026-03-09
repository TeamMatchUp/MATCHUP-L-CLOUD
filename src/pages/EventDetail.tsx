import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { MapPin, Calendar, ArrowLeft, ExternalLink, Ticket, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link } from "react-router-dom";
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

const WEIGHT_CLASS_LABELS: Record<string, string> = {
  strawweight: "Strawweight", flyweight: "Flyweight", bantamweight: "Bantamweight",
  featherweight: "Featherweight", lightweight: "Lightweight", super_lightweight: "Super Lightweight",
  welterweight: "Welterweight", super_welterweight: "Super Welterweight", middleweight: "Middleweight",
  super_middleweight: "Super Middleweight", light_heavyweight: "Light Heavyweight",
  cruiserweight: "Cruiserweight", heavyweight: "Heavyweight", super_heavyweight: "Super Heavyweight",
};

const SLOT_STATUS_STYLES: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  proposed: "bg-secondary/10 text-secondary",
  confirmed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, effectiveRoles } = useAuth();
  const isFighter = effectiveRoles.includes("fighter");
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);

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

  const handleConfirmInterest = async () => {
    if (!fighterProfile || !event) return;
    setSending(true);
    try {
      // Find all coaches linked to this fighter via gyms
      const { data: gymLinks } = await supabase
        .from("fighter_gym_links")
        .select("gym_id, gyms(coach_id)")
        .eq("fighter_id", fighterProfile.id)
        .eq("status", "accepted");

      const coachIds = new Set<string>();
      (gymLinks ?? []).forEach((link: any) => {
        if (link.gyms?.coach_id) coachIds.add(link.gyms.coach_id);
      });

      if (coachIds.size === 0) {
        toast.error("No linked coaches found to notify.");
        setSending(false);
        setShowConfirm(false);
        return;
      }

      // Send notification to each coach
      for (const coachId of coachIds) {
        await supabase.rpc("create_notification", {
          _user_id: coachId,
          _title: `${fighterProfile.name} is interested in an event`,
          _message: `${fighterProfile.name} is interested in "${event.title}" on ${new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`,
          _type: "event_update",
          _reference_id: id!,
        });
      }

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
            <Button variant="ghost" asChild>
              <Link to="/events"><ArrowLeft className="h-4 w-4 mr-2" />Back to Events</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const openSlots = event.fight_slots?.filter((s: any) => s.status === "open") ?? [];
  const confirmedSlots = event.fight_slots?.filter((s: any) => s.status === "confirmed") ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container">
            <Button variant="ghost" size="sm" asChild className="mb-6">
              <Link to="/events"><ArrowLeft className="h-4 w-4 mr-2" />All Events</Link>
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

              {/* Fighter Interest Button */}
              {isFighter && fighterProfile && (
                <Button
                  variant="outline"
                  className="mb-8 gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  onClick={() => setShowConfirm(true)}
                >
                  <Star className="h-4 w-4" />
                  I'm Interested
                </Button>
              )}

              {/* Location Map */}
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

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {[
                { label: "Total Slots", value: event.fight_slots?.length ?? 0 },
                { label: "Open", value: openSlots.length },
                { label: "Confirmed", value: confirmedSlots.length },
                { label: "Country", value: event.country },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="font-heading text-2xl text-foreground mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Tickets */}
            {event.ticket_enabled && tickets.length > 0 && (
              <>
                <h2 className="font-heading text-2xl text-foreground mb-6">
                  <Ticket className="inline h-5 w-5 mr-2 text-primary" />
                  TICKETS
                </h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-12">
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
                      {ticket.external_link && (
                        <Button asChild className="mt-auto gap-2">
                          <a href={ticket.external_link} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" /> Buy Tickets
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Fight Slots */}
            <h2 className="font-heading text-2xl text-foreground mb-6">
              FIGHT <span className="text-primary">CARD</span>
            </h2>
            {event.fight_slots && event.fight_slots.length > 0 ? (
              <div className="space-y-3">
                {event.fight_slots
                  .sort((a: any, b: any) => a.slot_number - b.slot_number)
                  .map((slot: any) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-heading text-lg text-muted-foreground w-8">#{slot.slot_number}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{WEIGHT_CLASS_LABELS[slot.weight_class]}</p>
                        </div>
                      </div>
                      <Badge className={SLOT_STATUS_STYLES[slot.status] ?? ""} variant="outline">
                        {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No fight slots defined yet.</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
