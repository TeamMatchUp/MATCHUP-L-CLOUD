import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { MapPin, Calendar, ArrowLeft, ExternalLink, Ticket, Star, Users, Plus, Phone, Globe, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PutForwardFightersDialog } from "@/components/coach/PutForwardFightersDialog";
import { ClaimEventDialog } from "@/components/organiser/ClaimEventDialog";
import { Map as PigeonMap, Marker } from "pigeon-maps";

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
  const [mainPage, setMainPage] = useState(0);
  const [underPage, setUnderPage] = useState(0);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
        .from("events").select("*, fight_slots(*), tickets(*)").eq("id", id!).single();
      if (error) throw error;
      return data;
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
      <div className="min-h-screen" style={{ background: "#0d0f12" }}>
        <Header />
        <main className="pt-16"><div className="container py-16"><div className="h-8 w-64 bg-card animate-pulse rounded mb-4" /><div className="h-4 w-48 bg-card animate-pulse rounded" /></div></main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen" style={{ background: "#0d0f12" }}>
        <Header />
        <main className="pt-16"><div className="container py-16 text-center">
          <h1 className="font-heading text-3xl text-foreground mb-4">Event Not Found</h1>
          <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        </div></main>
        <Footer />
      </div>
    );
  }

  // Filter to only confirmed + public bouts for the public page
  const publicBouts = allBouts.filter((b: any) => b.is_public === true && b.status === "confirmed" && (b.fighter_a_id || b.fighter_b_id));
  const mainEvents = publicBouts.filter((b: any) => b.bout_type === "Main Event");
  const undercards = publicBouts.filter((b: any) => b.bout_type !== "Main Event");

  const mainTotal = Math.ceil(mainEvents.length / BOUTS_PER_PAGE) || 1;
  const underTotal = Math.ceil(undercards.length / BOUTS_PER_PAGE) || 1;
  const paginatedMain = mainEvents.slice(mainPage * BOUTS_PER_PAGE, (mainPage + 1) * BOUTS_PER_PAGE);
  const paginatedUnder = undercards.slice(underPage * BOUTS_PER_PAGE, (underPage + 1) * BOUTS_PER_PAGE);

  const hasContact = event.contact_email || event.contact_phone || event.contact_website;
  const hasCoords = event.latitude != null && event.longitude != null;

  // Helper for open slot check (used in render)
  const isOpen = (bout: any) => !bout.fighter_a_id && !bout.fighter_b_id && bout.status === "open";

  const renderMainBout = (bout: any) => {
    const showDetails = bout.is_public === true && bout.status === "confirmed";
    const fA = showDetails ? unwrap(bout.fighter_a) : null;
    const fB = showDetails ? unwrap(bout.fighter_b) : null;
    const nameA = showDetails ? (fA?.name ?? "TBA") : "TBA";
    const nameB = showDetails ? (fB?.name ?? "TBA") : "TBA";
    return (
      <div key={bout.id} className="rounded-lg border-2 border-primary/30 bg-card p-6 relative">
        {/* Three-column layout with fixed center: Fighter A | VS + Weight | Fighter B */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 140px 1fr" }}>
          {/* Fighter A — left aligned */}
          <div className="flex items-center gap-3 overflow-hidden">
            {showDetails && fA?.profile_image && (
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-full overflow-hidden border-2 border-primary/30 shrink-0">
                <img src={fA.profile_image} alt={fA.name} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="text-left min-w-0">
              {showDetails && fA ? (
                <Link to={`/fighters/${fA.id}`} className="hover:text-primary transition-colors">
                  <p className="font-heading text-xl md:text-2xl text-foreground uppercase truncate">{nameA}</p>
                </Link>
              ) : (
                <p className="font-heading text-xl md:text-2xl text-muted-foreground uppercase">{nameA}</p>
              )}
              {showDetails && fA && <p className="text-primary font-bold text-lg mt-1">{fA.record_wins}-{fA.record_losses}-{fA.record_draws}</p>}
            </div>
          </div>
          {/* Centre — VS + weight class */}
          <div className="flex flex-col items-center justify-center">
            {isOpen(bout) && <span className="text-primary text-xs font-semibold uppercase tracking-wide">Open</span>}
            <span className="font-heading text-primary text-2xl">VS</span>
            {bout.weight_class && <p className="text-xs text-muted-foreground mt-1 whitespace-nowrap">{WEIGHT_CLASS_LABELS[bout.weight_class] || bout.weight_class}</p>}
          </div>
          {/* Fighter B — right aligned */}
          <div className="flex items-center gap-3 justify-end overflow-hidden">
            <div className="text-right min-w-0">
              {showDetails && fB ? (
                <Link to={`/fighters/${fB.id}`} className="hover:text-primary transition-colors">
                  <p className="font-heading text-xl md:text-2xl text-foreground uppercase truncate">{nameB}</p>
                </Link>
              ) : (
                <p className="font-heading text-xl md:text-2xl text-muted-foreground uppercase">{nameB}</p>
              )}
              {showDetails && fB && <p className="text-primary font-bold text-lg mt-1">{fB.record_wins}-{fB.record_losses}-{fB.record_draws}</p>}
            </div>
            {showDetails && fB?.profile_image && (
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
    const showDetails = bout.is_public === true && bout.status === "confirmed";
    const fA = showDetails ? unwrap(bout.fighter_a) : null;
    const fB = showDetails ? unwrap(bout.fighter_b) : null;
    const nameA = showDetails ? (fA?.name ?? "TBA") : "TBA";
    const nameB = showDetails ? (fB?.name ?? "TBA") : "TBA";
    return (
      <div key={bout.id} className="rounded-lg border border-border bg-card p-4 relative">
        <div className="grid items-center gap-3" style={{ gridTemplateColumns: "1fr 120px 1fr" }}>
          {/* Fighter A */}
          <div className="flex items-center gap-2 overflow-hidden">
            {showDetails && fA?.profile_image && (
              <div className="h-10 w-10 rounded-full overflow-hidden border border-primary/20 shrink-0">
                <img src={fA.profile_image} alt={fA.name} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="text-left min-w-0">
              {showDetails && fA ? (
                <Link to={`/fighters/${fA.id}`} className="hover:text-primary transition-colors">
                  <p className="font-heading text-sm text-foreground uppercase truncate">{nameA}</p>
                </Link>
              ) : <p className="font-heading text-sm text-muted-foreground uppercase">{nameA}</p>}
              {showDetails && fA && <p className="text-xs text-muted-foreground">{fA.record_wins}-{fA.record_losses}-{fA.record_draws}</p>}
            </div>
          </div>
          {/* Centre */}
          <div className="flex flex-col items-center justify-center">
            {isOpen(bout) && <span className="text-primary text-[10px] font-semibold uppercase tracking-wide">Open</span>}
            <span className="font-heading text-primary text-xs">VS</span>
            {bout.weight_class && <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">{WEIGHT_CLASS_LABELS[bout.weight_class] || bout.weight_class}</p>}
          </div>
          {/* Fighter B */}
          <div className="flex items-center gap-2 justify-end overflow-hidden">
            <div className="text-right min-w-0">
              {showDetails && fB ? (
                <Link to={`/fighters/${fB.id}`} className="hover:text-primary transition-colors">
                  <p className="font-heading text-sm text-foreground uppercase truncate">{nameB}</p>
                </Link>
              ) : <p className="font-heading text-sm text-muted-foreground uppercase">{nameB}</p>}
              {showDetails && fB && <p className="text-xs text-muted-foreground">{fB.record_wins}-{fB.record_losses}-{fB.record_draws}</p>}
            </div>
            {showDetails && fB?.profile_image && (
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

  return (
    <div className="min-h-screen" style={{ background: "#0d0f12" }}>
      <Header />
      <main className="pt-16">
        <section style={{ padding: "10px 0" }}>
          <div className="container" style={{ paddingLeft: 35, paddingRight: 35 }}>
            <div className="pt-2">
              <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />Back
              </Button>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              {/* Banner hero */}
              {event.banner_image && (
                <div className="mb-8 rounded-xl overflow-hidden relative" style={{ height: 280 }}>
                  <img src={event.banner_image} alt={event.title} className="w-full h-full object-cover" />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, rgba(13,15,18,0.95) 100%)" }} />
                  <h1 className="absolute bottom-6 left-6 font-heading text-4xl md:text-5xl text-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{event.title}</h1>
                </div>
              )}

              {/* Two-panel layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {/* Left panel */}
                <div>
                  {!event.banner_image && <h1 className="font-heading text-4xl md:text-5xl text-foreground mb-2">{event.title}</h1>}
                  {event.promotion_name && <p className="text-lg text-muted-foreground mb-4">{event.promotion_name}</p>}

                  {event.description && (
                    <p className="text-muted-foreground mb-6">{event.description}</p>
                  )}

                  <div className="flex flex-wrap gap-6 text-sm text-muted-foreground mb-6">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      {new Date(event.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </span>
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {[event.venue_name, event.location, event.city].filter(Boolean).join(", ")}
                    </span>
                  </div>

                  {hasContact && (
                    <div className="rounded-lg border border-border bg-card p-5 mb-6">
                      <h3 className="font-heading text-sm text-muted-foreground uppercase tracking-wide mb-3">Contact</h3>
                      <div className="space-y-2 text-sm">
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
                    </div>
                  )}

                  {(event as any).show_ticket_sales && (
                    <div className="rounded-lg border border-border bg-card p-5 mb-6">
                      <h3 className="font-heading text-sm text-muted-foreground uppercase tracking-wide mb-3">Tickets</h3>
                      {event.sold_out ? (
                        <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-sm px-3 py-1">Sold Out</Badge>
                      ) : (
                        <div className="space-y-3">
                          {event.ticket_count && (
                            <p className="text-sm text-foreground font-medium">{event.ticket_count} tickets available</p>
                          )}
                          {event.tickets_url && (
                            <Button asChild className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                              <a href={event.tickets_url} target="_blank" rel="noopener noreferrer">
                                <Ticket className="h-4 w-4" /> Buy Tickets
                              </a>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!(event as any).show_ticket_sales && event.tickets_url && (
                    <Button asChild className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 mb-6">
                      <a href={event.tickets_url} target="_blank" rel="noopener noreferrer">
                        <Ticket className="h-4 w-4" /> Buy Tickets
                      </a>
                    </Button>
                  )}

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
                    {isOrganiser && user && event.organiser_id === user.id && (
                      <Button className="gap-2" asChild>
                        <Link to={`/organiser/events/${id}`}>
                          <Plus className="h-4 w-4" /> Manage Event
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Right panel — map */}
                <div>
                  {hasCoords ? (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <div style={{ height: 320 }}>
                        <PigeonMap defaultCenter={[event.latitude!, event.longitude!]} defaultZoom={14} height={320}>
                          <Marker anchor={[event.latitude!, event.longitude!]} color="hsl(46, 93%, 61%)" width={36} />
                        </PigeonMap>
                      </div>
                      <div className="bg-card px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 text-primary" />
                        {[event.venue_name, event.location, event.city].filter(Boolean).join(", ")}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-card p-8 flex items-center justify-center h-[320px]">
                      <div className="text-center text-muted-foreground">
                        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Map unavailable — no coordinates set</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* FIGHT CARD — only show sections with confirmed public bouts */}
            {mainEvents.length > 0 && (
              <>
                <h2 className="font-heading text-2xl text-foreground mb-6">
                  MAIN <span className="text-primary">CARD</span>
                </h2>
                <div className="space-y-4 mb-4">{paginatedMain.map(renderMainBout)}</div>
                <Pagination page={mainPage} total={Math.ceil(mainEvents.length / BOUTS_PER_PAGE) || 1} setPage={setMainPage} />
              </>
            )}

            {undercards.length > 0 && (
              <>
                <h2 className="font-heading text-2xl text-foreground mb-6 mt-12">
                  UNDER<span className="text-primary">CARD</span>
                </h2>
                <div className="space-y-2 mb-4">{paginatedUnder.map(renderUndercardBout)}</div>
                <Pagination page={underPage} total={Math.ceil(undercards.length / BOUTS_PER_PAGE) || 1} setPage={setUnderPage} />
              </>
            )}

            {mainEvents.length === 0 && undercards.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center mb-4">
                <p className="text-muted-foreground text-sm">No bouts announced yet.</p>
              </div>
            )}
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

      <Footer />
    </div>
  );
}
