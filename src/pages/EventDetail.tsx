import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { MapPin, Calendar, ArrowLeft, ExternalLink, Ticket, Star, Users, Plus, Phone, Globe, Mail, ShoppingCart, Map as MapIcon, Settings, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { addToBasket } from "@/pages/Checkout";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { PutForwardFightersDialog } from "@/components/coach/PutForwardFightersDialog";
import { ClaimEventDialog } from "@/components/organiser/ClaimEventDialog";
import { Map as PigeonMap, Marker } from "pigeon-maps";
import { BoostedBadge } from "@/components/BoostedBadge";
import { useActiveBoost } from "@/hooks/useActiveBoost";
import { WaitlistDialog } from "@/components/event/WaitlistDialog";
import { EventDetailsCard } from "@/components/event/EventDetailsCard";

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

function TicketSection({ tickets, event, purchaseUrl }: { tickets: any[]; event: any; purchaseUrl: string | null }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const setQty = (ticketId: string, val: number) => {
    setQuantities((prev) => ({ ...prev, [ticketId]: val }));
  };

  const totalLeft = tickets.reduce((s: number, t: any) => s + (t.quantity_available ?? 0), 0);
  const selected = tickets
    .map((t: any) => ({ t, qty: quantities[t.id] || 0 }))
    .filter(({ qty }) => qty > 0);
  const totalQty = selected.reduce((s, { qty }) => s + qty, 0);
  const totalPrice = selected.reduce((s, { t, qty }) => s + Number(t.price || 0) * qty, 0);

  const handleAddAllToBasket = () => {
    if (totalQty <= 0) return;
    selected.forEach(({ t, qty }) => {
      addToBasket({
        ticket_id: t.id,
        ticket_type: t.ticket_type,
        price: Number(t.price),
        quantity: qty,
        event_id: event.id,
        event_title: event.title,
      });
    });

    setQuantities({});
    toast.success(`${totalQty} ticket${totalQty === 1 ? "" : "s"} added to basket`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, letterSpacing: "0.08em", color: "hsl(var(--primary))" }}>
          TICKETS
        </h3>
        {totalLeft > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            <Ticket style={{ width: 12, height: 12 }} /> {totalLeft.toLocaleString()} left
          </span>
        )}
      </div>

      <div className="space-y-5">
        {tickets.map((ticket: any, idx: number) => {
          const ticketUrl = purchaseUrl || ticket.external_link || null;
          const qty = quantities[ticket.id] || 0;
          const maxQty = ticket.quantity_available ?? 100;
          const soldOut = event.sold_out || (ticket.quantity_available != null && ticket.quantity_available <= 0);
          const lowStock = !soldOut && ticket.quantity_available != null && ticket.quantity_available <= 50;

          return (
            <div key={ticket.id}>
              {idx > 0 && <div style={{ height: 1, background: "hsl(var(--border, var(--muted)) / 0.6)", marginBottom: 20, opacity: 0.15 }} />}

              {/* Row 1: name + price */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div style={{ fontSize: 15, fontWeight: 700, color: "hsl(var(--foreground))", lineHeight: 1.2 }}>
                    {ticket.ticket_type}
                  </div>
                  {ticket.description && (
                    <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 4, lineHeight: 1.4 }}>
                      {ticket.description}
                    </div>
                  )}
                </div>
                {ticket.price != null && (
                  <div style={{ fontSize: 16, fontWeight: 700, color: "hsl(var(--primary))", whiteSpace: "nowrap" }}>
                    £{Number(ticket.price).toFixed(0)}
                  </div>
                )}
              </div>

              {/* Row 2: availability + stepper (or buy link) */}
              <div className="flex items-center justify-between mt-3">
                <div style={{ fontSize: 12 }}>
                  {soldOut ? (
                    <span style={{ color: "hsl(var(--primary))", fontWeight: 600 }}>Sold Out</span>
                  ) : lowStock ? (
                    <span style={{ color: "hsl(var(--primary))", fontWeight: 600 }}>
                      Only {ticket.quantity_available} left
                    </span>
                  ) : ticket.quantity_available != null ? (
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>
                      {ticket.quantity_available.toLocaleString()} available
                    </span>
                  ) : (
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>Available</span>
                  )}
                </div>

                {soldOut ? null : ticketUrl ? (
                  <a
                    href={ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5"
                    style={{
                      padding: "6px 12px", fontSize: 12, fontWeight: 600,
                      background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))",
                      borderRadius: 6, textDecoration: "none",
                    }}
                  >
                    <ShoppingCart style={{ width: 12, height: 12 }} /> Buy
                  </a>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty(ticket.id, Math.max(0, qty - 1))}
                      disabled={qty <= 0}
                      aria-label="Decrease quantity"
                      style={{
                        width: 28, height: 28, borderRadius: "50%", border: "none",
                        cursor: qty <= 0 ? "not-allowed" : "pointer",
                        background: "hsl(var(--muted))",
                        color: qty <= 0 ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
                        fontSize: 16, fontWeight: 500,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >−</button>
                    <div
                      style={{
                        minWidth: 32, height: 28, borderRadius: 999,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, color: "hsl(var(--foreground))",
                        boxShadow: qty > 0 ? "inset 0 0 0 1.5px hsl(var(--primary))" : "none",
                        padding: "0 10px",
                      }}
                    >
                      {qty}
                    </div>
                    <button
                      type="button"
                      onClick={() => setQty(ticket.id, Math.min(maxQty, qty + 1))}
                      disabled={qty >= maxQty}
                      aria-label="Increase quantity"
                      style={{
                        width: 28, height: 28, borderRadius: "50%", border: "none",
                        cursor: qty >= maxQty ? "not-allowed" : "pointer",
                        background: "hsl(var(--muted))",
                        color: qty >= maxQty ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
                        fontSize: 16, fontWeight: 500,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >+</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalQty > 0 && (
        <>
          <div style={{ height: 1, background: "hsl(var(--foreground) / 0.08)", margin: "20px 0 14px" }} />
          <div className="space-y-1.5 mb-4">
            {selected.map(({ t, qty }) => (
              <div key={t.id} className="flex items-center justify-between" style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
                <span>{qty} × {t.ticket_type}</span>
                <span style={{ color: "hsl(var(--foreground))" }}>£{(Number(t.price) * qty).toFixed(0)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2" style={{ fontSize: 14 }}>
              <span style={{ color: "hsl(var(--foreground))", fontWeight: 700 }}>Total</span>
              <span style={{ color: "hsl(var(--foreground))", fontWeight: 700 }}>£{totalPrice.toFixed(0)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddAllToBasket}
            className="w-full inline-flex items-center justify-center gap-2"
            style={{
              padding: "14px 16px", fontSize: 14, fontWeight: 700,
              background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))",
              borderRadius: 10, border: "none", cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            <ShoppingCart style={{ width: 14, height: 14 }} />
            ADD {totalQty} TO BASKET — £{totalPrice.toFixed(0)}
          </button>
        </>
      )}
    </div>
  );
}



export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: activeBoost } = useActiveBoost(id);
  const { user, effectiveRoles } = useAuth();
  const isFighter = effectiveRoles.includes("fighter");
  const isCoach = effectiveRoles.includes("coach");
  const isOrganiser = effectiveRoles.includes("organiser");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPutForward, setShowPutForward] = useState(false);
  const [showClaimEvent, setShowClaimEvent] = useState(false);
  const [sending, setSending] = useState(false);
  const [mainPage, setMainPage] = useState(0);
  const [underPage, setUnderPage] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const BOUTS_PER_PAGE = 5;

  // Load fighter profile for fighters AND coaches (coaches also have fighter profiles)
  const { data: fighterProfile } = useQuery({
    queryKey: ["my-fighter-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fighter_profiles").select("id, name").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && (isFighter || isCoach),
  });

  const { data: existingInterest } = useQuery({
    queryKey: ["fighter-event-interest", fighterProfile?.id, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fighter_event_interests").select("id")
        .eq("fighter_id", fighterProfile!.id).eq("event_id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!fighterProfile && !!id,
  });

  const handleToggleInterest = async () => {
    if (!fighterProfile || !event) return;
    setSending(true);
    try {
      if (existingInterest) {
        await supabase.from("fighter_event_interests").delete().eq("id", existingInterest.id);
        const { data: gymLinks } = await supabase
          .from("fighter_gym_links").select("gym_id, gyms(coach_id)")
          .eq("fighter_id", fighterProfile.id).eq("status", "approved");
        const coachIds = new Set<string>();
        (gymLinks ?? []).forEach((link: any) => { if (link.gyms?.coach_id) coachIds.add(link.gyms.coach_id); });
        for (const coachId of coachIds) {
          await supabase.from("notifications").delete()
            .eq("user_id", coachId).eq("reference_id", id!).eq("type", "event_update");
        }
        queryClient.invalidateQueries({ queryKey: ["fighter-event-interest", fighterProfile.id, id] });
        queryClient.invalidateQueries({ queryKey: ["fighter-event-interests"] });
        toast.success("Interest removed");
      } else {
        const { error: insertError } = await supabase
          .from("fighter_event_interests").insert({ fighter_id: fighterProfile.id, event_id: id! });
        if (insertError) throw insertError;
        const { data: gymLinks } = await supabase
          .from("fighter_gym_links").select("gym_id, gyms(coach_id)")
          .eq("fighter_id", fighterProfile.id).eq("status", "approved");
        const coachIds = new Set<string>();
        (gymLinks ?? []).forEach((link: any) => { if (link.gyms?.coach_id) coachIds.add(link.gyms.coach_id); });
        for (const coachId of coachIds) {
          await supabase.rpc("create_notification", {
            _user_id: coachId,
            _title: `${fighterProfile.name} is interested in an event`,
            _message: `${fighterProfile.name} is interested in "${event.title}" on ${new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`,
            _type: "event_update", _reference_id: id!,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["fighter-event-interest", fighterProfile.id, id] });
        queryClient.invalidateQueries({ queryKey: ["fighter-event-interests"] });
        toast.success("Your interest has been registered and your coach has been notified!");
      }
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
        .from("events").select("*, fight_slots(*)").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: eventTickets = [] } = useQuery({
    queryKey: ["event-public-tickets", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("event_id", id!)
        .order("price", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: allBouts = [] } = useQuery({
    queryKey: ["event-confirmed-bouts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_fight_slots")
        .select("*, fighter_a:fighter_profiles!event_fight_slots_fighter_a_id_fkey(id, name, record_wins, record_losses, record_draws, weight_class, profile_image), fighter_b:fighter_profiles!event_fight_slots_fighter_b_id_fkey(id, name, record_wins, record_losses, record_draws, weight_class, profile_image)")
        .eq("event_id", id!)
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
        <main className="pt-16"><div className="container py-6 md:py-10"><div className="h-8 w-64 bg-card animate-pulse rounded mb-4" /><div className="h-4 w-48 bg-card animate-pulse rounded" /></div></main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16"><div className="container py-6 md:py-10 text-center">
          <h1 className="font-heading text-3xl text-foreground mb-4">Event Not Found</h1>
          <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        </div></main>
        <Footer />
      </div>
    );
  }

  const isOwnEvent = !!(user && event.organiser_id === user.id);
  const isPreview = searchParams.get("preview") === "true";

  // Show all public bouts regardless of status; render details based on assignment + status
  const publicBouts = allBouts.filter((b: any) => b.is_public === true);
  const mainEvents = publicBouts.filter((b: any) => b.bout_type === "Main Event");
  const undercards = publicBouts.filter((b: any) => b.bout_type !== "Main Event");

  const mainTotal = Math.ceil(mainEvents.length / BOUTS_PER_PAGE) || 1;
  const underTotal = Math.ceil(undercards.length / BOUTS_PER_PAGE) || 1;
  const paginatedMain = mainEvents.slice(mainPage * BOUTS_PER_PAGE, (mainPage + 1) * BOUTS_PER_PAGE);
  const paginatedUnder = undercards.slice(underPage * BOUTS_PER_PAGE, (underPage + 1) * BOUTS_PER_PAGE);

  const hasContact = event.contact_email || event.contact_phone || event.contact_website;
  const hasCoords = event.latitude != null && event.longitude != null;

  // Reveal fighter details only when bout is confirmed AND public
  const isRevealed = (bout: any) =>
    bout.is_public === true && (bout.status || "").toLowerCase() === "confirmed";

  const renderMainBout = (bout: any) => {
    const revealed = isRevealed(bout);
    const fA = revealed ? unwrap(bout.fighter_a) : null;
    const fB = revealed ? unwrap(bout.fighter_b) : null;
    const nameA = fA?.name ?? "TBD";
    const nameB = fB?.name ?? "TBD";
    return (
      <div key={bout.id} className="rounded-lg border-2 border-primary/30 bg-card p-4 sm:p-6 relative">
        <div className="grid items-center gap-2 sm:gap-4" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
          {/* Fighter A — left aligned */}
          <div className="flex items-center gap-3 overflow-hidden">
            {fA?.profile_image && (
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-full overflow-hidden border-2 border-primary/30 shrink-0">
                <img src={fA.profile_image} alt={fA.name} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="text-left min-w-0">
              {fA ? (
                <Link to={`/fighters/${fA.id}?from=event&eventId=${id}`} className="hover:text-primary transition-colors">
                  <p className="font-heading text-xl md:text-2xl text-foreground uppercase truncate">{nameA}</p>
                </Link>
              ) : (
                <p className="font-heading text-xl md:text-2xl text-muted-foreground uppercase">{nameA}</p>
              )}
              {fA && <p className="text-primary font-bold text-lg mt-1">{fA.record_wins}-{fA.record_losses}-{fA.record_draws}</p>}
            </div>
          </div>
          {/* Centre */}
          <div className="flex flex-col items-center justify-center self-center px-1 sm:px-2">
            <span className="font-heading text-primary text-xl sm:text-2xl leading-none">VS</span>
            {bout.weight_class && <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 text-center whitespace-nowrap">{WEIGHT_CLASS_LABELS[bout.weight_class] || bout.weight_class}</p>}
          </div>
          {/* Fighter B — right aligned */}
          <div className="flex items-center gap-3 justify-end overflow-hidden">
            <div className="text-right min-w-0">
              {fB ? (
                <Link to={`/fighters/${fB.id}?from=event&eventId=${id}`} className="hover:text-primary transition-colors">
                  <p className="font-heading text-xl md:text-2xl text-foreground uppercase truncate">{nameB}</p>
                </Link>
              ) : (
                <p className="font-heading text-xl md:text-2xl text-muted-foreground uppercase">{nameB}</p>
              )}
              {fB && <p className="text-primary font-bold text-lg mt-1">{fB.record_wins}-{fB.record_losses}-{fB.record_draws}</p>}
            </div>
            {fB?.profile_image && (
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-full overflow-hidden border-2 border-primary/30 shrink-0">
                <img src={fB.profile_image} alt={fB.name} className="h-full w-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderUndercardBout = (bout: any) => {
    const revealed = isRevealed(bout);
    const fA = revealed ? unwrap(bout.fighter_a) : null;
    const fB = revealed ? unwrap(bout.fighter_b) : null;
    const nameA = fA?.name ?? "TBD";
    const nameB = fB?.name ?? "TBD";
    return (
      <div key={bout.id} className="rounded-lg border border-border bg-card p-3 sm:p-4 relative">
        <div className="grid items-center gap-2 sm:gap-3" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
          {/* Fighter A */}
          <div className="flex items-center gap-2 overflow-hidden">
            {fA?.profile_image && (
              <div className="h-10 w-10 rounded-full overflow-hidden border border-primary/20 shrink-0">
                <img src={fA.profile_image} alt={fA.name} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="text-left min-w-0">
              {fA ? (
                <Link to={`/fighters/${fA.id}?from=event&eventId=${id}`} className="hover:text-primary transition-colors">
                  <p className="font-heading text-sm text-foreground uppercase truncate">{nameA}</p>
                </Link>
              ) : <p className="font-heading text-sm text-muted-foreground uppercase">{nameA}</p>}
              {fA && <p className="text-xs text-muted-foreground">{fA.record_wins}-{fA.record_losses}-{fA.record_draws}</p>}
            </div>
          </div>
          {/* Centre */}
          <div className="flex flex-col items-center justify-center self-center px-1">
            <span className="font-heading text-primary text-xs leading-none">VS</span>
            {bout.weight_class && <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 text-center whitespace-nowrap">{WEIGHT_CLASS_LABELS[bout.weight_class] || bout.weight_class}</p>}
          </div>
          {/* Fighter B */}
          <div className="flex items-center gap-2 justify-end overflow-hidden">
            <div className="text-right min-w-0">
              {fB ? (
                <Link to={`/fighters/${fB.id}?from=event&eventId=${id}`} className="hover:text-primary transition-colors">
                  <p className="font-heading text-sm text-foreground uppercase truncate">{nameB}</p>
                </Link>
              ) : <p className="font-heading text-sm text-muted-foreground uppercase">{nameB}</p>}
              {fB && <p className="text-xs text-muted-foreground">{fB.record_wins}-{fB.record_losses}-{fB.record_draws}</p>}
            </div>
            {fB?.profile_image && (
              <div className="h-10 w-10 rounded-full overflow-hidden border border-primary/20 shrink-0">
                <img src={fB.profile_image} alt={fB.name} className="h-full w-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };


  const Pagination = ({ page: p, total, setPage: sp }: { page: number; total: number; setPage: (n: number) => void }) => {
    if (total <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <Button variant="outline" size="sm" disabled={p === 0} onClick={() => sp(p - 1)}>
          <ArrowLeft className="h-3 w-3 mr-1" /> Prev
        </Button>
        {Array.from({ length: total }, (_, i) => (
          <Button key={i} variant={i === p ? "default" : "outline"} size="sm" className="w-8 h-8 p-0" onClick={() => sp(i)}>{i + 1}</Button>
        ))}
        <Button variant="outline" size="sm" disabled={p >= total - 1} onClick={() => sp(p + 1)}>
          Next <ArrowLeft className="h-3 w-3 ml-1 rotate-180" />
        </Button>
      </div>
    );
  };

  // Fight card sections are conditionally rendered below based on whether public confirmed bouts exist

  const eventTitle = (event as any)?.title ?? "Event";
  const eventCity = (event as any)?.city ?? "";
  const eventDesc = `${eventTitle}${eventCity ? ` in ${eventCity}` : ""} — fight card, tickets and details on MatchUp.`;
  const eventJsonLd = event ? {
    "@context": "https://schema.org",
    "@type": "Event",
    name: eventTitle,
    startDate: (event as any).date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: (event as any).venue_name || eventCity,
      address: [eventCity, (event as any).country].filter(Boolean).join(", "),
    },
    image: (event as any).banner_image || undefined,
    description: (event as any).description || eventDesc,
  } : undefined;
  return (
    <div className="min-h-screen bg-background">
      <SEO title={eventTitle} description={eventDesc} ogType="event" image={(event as any)?.banner_image ?? undefined} jsonLd={eventJsonLd} />
      <Header />


      {isOwnEvent && isPreview && (
        <div
          style={{
            position: "sticky", top: 60, zIndex: 28,
            background: "rgba(239,68,68,0.12)",
            backdropFilter: "blur(12px)",
            boxShadow: "inset 0 -1px 0 rgba(239,68,68,0.25)",
            padding: "10px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          }}
        >
          <span style={{ fontSize: 13, color: "hsl(var(--foreground))", fontWeight: 600 }}>
            Previewing your public event page
          </span>
          <button
            onClick={() => navigate(`/organiser/events/${id}`)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))",
              fontSize: 12, fontWeight: 700, borderRadius: 8,
              padding: "6px 12px", border: "none", cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Manage Event
          </button>
        </div>
      )}
      {isOwnEvent && !isPreview && (
        <button
          onClick={() => navigate(`/organiser/events/${id}`)}
          style={{
            position: "fixed", top: 72, right: 16, zIndex: 28,
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))",
            fontSize: 12, fontWeight: 700, borderRadius: 999,
            padding: "6px 14px", border: "none", cursor: "pointer", whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <Settings className="h-3.5 w-3.5" /> Manage Event
        </button>
      )}
      <main className="pt-16">
        <section style={{ padding: "10px 0" }}>
          <div className="container" style={{ paddingLeft: 16, paddingRight: 16 }}>
            <div className="pt-2">
              <Link
                to="/explore?tab=events"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <ArrowLeft className="h-4 w-4" /> All events
              </Link>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              {/* Optional slim cover strip (no title overlay) */}
              {event.banner_image && (
                <div className="mb-6 rounded-xl overflow-hidden" style={{ height: 140 }}>
                  <img src={event.banner_image} alt={event.title} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Hero header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <span
                    className="text-xs font-semibold uppercase"
                    style={{ color: "hsl(var(--primary))", letterSpacing: "0.14em" }}
                  >
                    {[event.promotion_name, event.discipline].filter(Boolean).join(" · ") || "EVENT"}
                  </span>
                  {activeBoost && <BoostedBadge size="sm" />}
                </div>
                <h1
                  className="font-heading text-foreground"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(2.25rem, 7vw, 4.5rem)", lineHeight: 1, letterSpacing: "0.01em" }}
                >
                  {event.title}
                </h1>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mt-4">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {new Date(event.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  {(event.venue_name || event.location || event.city) && (
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {[event.venue_name, event.city].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
              </div>

              {/* Two-column body */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
                {/* LEFT column */}
                <div className="min-w-0 space-y-6">
                  {hasCoords && (
                    <div
                      className="rounded-xl overflow-hidden bg-card"
                      style={{ boxShadow: "var(--shadow-card)" }}
                    >
                      <div style={{ height: 300 }}>
                        <PigeonMap defaultCenter={[event.latitude!, event.longitude!]} defaultZoom={14} height={300}>
                          <Marker anchor={[event.latitude!, event.longitude!]} color="hsl(46, 93%, 61%)" width={36} />
                        </PigeonMap>
                      </div>
                      <div className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {event.venue_name || "Venue"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[event.city, new Date(event.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline whitespace-nowrap"
                        >
                          Open in Maps <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Fighter/coach actions — above About */}
                  {(((isFighter || isCoach) && fighterProfile) || isCoach) && (
                    <div className="flex flex-wrap gap-3">
                      {user && (isFighter || isCoach) && fighterProfile && (
                        existingInterest ? (
                          <Button variant="outline" className="gap-2 border-primary/50 text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50" onClick={handleToggleInterest} disabled={sending}>
                            <Star className="h-4 w-4 fill-primary" /> Interested
                          </Button>
                        ) : (
                          <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={handleToggleInterest} disabled={sending}>
                            <Star className="h-4 w-4" /> I'm Interested
                          </Button>
                        )
                      )}
                      {isCoach && user && (
                        <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => setShowPutForward(true)}>
                          <Users className="h-4 w-4" /> Put Forward Fighters
                        </Button>
                      )}
                    </div>
                  )}

                  {/* About + contact */}
                  {(event.description || hasContact) && (
                    <div className="rounded-xl bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
                      <h2
                        style={{
                          fontFamily: "'Bebas Neue', sans-serif",
                          letterSpacing: "0.08em",
                          fontSize: 13,
                          color: "hsl(var(--primary))",
                          marginBottom: 12,
                        }}
                      >
                        ABOUT
                      </h2>
                      {event.description && (
                        <p className="text-muted-foreground whitespace-pre-wrap mb-4">{event.description}</p>
                      )}
                      {hasContact && (
                        <div className="space-y-2 text-sm pt-2">
                          {event.contact_email && (
                            <a href={`mailto:${event.contact_email}`} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                              <Mail className="h-4 w-4 text-muted-foreground" /> {event.contact_email}
                            </a>
                          )}
                          {event.contact_phone && (
                            <a href={`tel:${event.contact_phone}`} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                              <Phone className="h-4 w-4 text-muted-foreground" /> {event.contact_phone}
                            </a>
                          )}
                          {event.contact_website && (
                            <a href={event.contact_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                              <Globe className="h-4 w-4 text-muted-foreground" /> {event.contact_website}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Event Details (moved from sidebar so it sits above the fight card) */}
                  <EventDetailsCard
                    rows={[
                      { label: "Promoter", value: event.promotion_name },
                      { label: "Discipline", value: event.discipline ? String(event.discipline).replace(/_/g, " ") : null },
                      { label: "Venue", value: event.venue_name },
                      { label: "City", value: event.city },
                      { label: "Date", value: new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
                    ]}
                  />

                  {/* FIGHT CARD */}
                  {mainEvents.length > 0 && (
                    <div>
                      <h2 className="font-heading text-2xl text-foreground mb-4">
                        MAIN <span className="text-primary">CARD</span>
                      </h2>
                      <div className="space-y-4 mb-4">{paginatedMain.map(renderMainBout)}</div>
                      <Pagination page={mainPage} total={Math.ceil(mainEvents.length / BOUTS_PER_PAGE) || 1} setPage={setMainPage} />
                    </div>
                  )}

                  {undercards.length > 0 && (
                    <div>
                      <h2 className="font-heading text-2xl text-foreground mb-4">
                        UNDER<span className="text-primary">CARD</span>
                      </h2>
                      <div className="space-y-2 mb-4">{paginatedUnder.map(renderUndercardBout)}</div>
                      <Pagination page={underPage} total={Math.ceil(undercards.length / BOUTS_PER_PAGE) || 1} setPage={setUnderPage} />
                    </div>
                  )}

                  {mainEvents.length === 0 && undercards.length === 0 && (
                    <div className="rounded-xl bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
                      <p className="text-muted-foreground text-sm">No bouts announced yet.</p>
                    </div>
                  )}
                </div>

                {/* RIGHT column (sticky on lg+) */}
                <aside className="lg:sticky lg:top-[80px] lg:self-start space-y-4">
                  {(() => {
                    const tickets = eventTickets;
                    const now = new Date();
                    const activeTickets = tickets.filter((t: any) =>
                      !t.sales_end || new Date(t.sales_end) >= now
                    );
                    const allSoldOut =
                      event.sold_out === true ||
                      (event.ticket_enabled && activeTickets.length > 0 &&
                        activeTickets.every((t: any) => t.quantity_available != null && t.quantity_available <= 0));

                    if (allSoldOut) {
                      return (
                        <div
                          className="rounded-xl bg-card p-5"
                          style={{
                            backdropFilter: "blur(20px) saturate(160%)",
                            WebkitBackdropFilter: "blur(20px) saturate(160%)",
                            boxShadow: "var(--shadow-card)",
                          }}
                        >
                          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.08em", fontSize: 13, color: "hsl(var(--primary))" }}>TICKETS</h2>
                          <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "hsl(var(--destructive))", letterSpacing: "0.04em", marginTop: 6 }}>SOLD OUT</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Every ticket for this event has gone. Join the waitlist to be first in line for returns.
                          </p>
                          <Button size="lg" className="w-full mt-4" onClick={() => setShowWaitlist(true)}>
                            Join waitlist
                          </Button>
                        </div>
                      );
                    }

                    if (activeTickets.length > 0) {
                      const purchaseUrl = (event as any).ticket_url || null;
                      return (
                        <div
                          className="rounded-xl bg-card p-5"
                          style={{ boxShadow: "var(--shadow-card)" }}
                        >
                          <TicketSection tickets={activeTickets} event={event} purchaseUrl={purchaseUrl} />
                        </div>
                      );

                    }
                    return null;
                  })()}
                </aside>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

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
            <AlertDialogAction onClick={handleToggleInterest} disabled={sending}>
              {sending ? "Sending..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isCoach && user && event && (
        <PutForwardFightersDialog open={showPutForward} onOpenChange={setShowPutForward} coachId={user.id} eventId={id!} eventTitle={event.title} />
      )}

      {user && (isCoach || effectiveRoles.includes("organiser")) && event && !event.organiser_id && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3">
          <div className="container flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Are you the promoter of this event? <span className="text-foreground font-medium">Claim this listing</span> to manage it.
            </p>
            <Button size="sm" onClick={() => setShowClaimEvent(true)}>Claim Event</Button>
          </div>
        </div>
      )}

      {showClaimEvent && event && (
        <ClaimEventDialog open={showClaimEvent} onOpenChange={setShowClaimEvent} eventId={id!} eventTitle={event.title} />
      )}

      {event && (
        <WaitlistDialog
          open={showWaitlist}
          onOpenChange={setShowWaitlist}
          eventId={id!}
          eventTitle={event.title}
          organiserId={event.organiser_id}
        />
      )}

      <Footer />
    </div>
  );
}
