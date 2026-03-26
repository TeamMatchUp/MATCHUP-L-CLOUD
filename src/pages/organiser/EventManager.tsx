import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditEventDialog } from "@/components/organiser/EditEventDialog";
import { AddFightManuallyDialog } from "@/components/organiser/AddFightManuallyDialog";
import { EditBoutDialog } from "@/components/organiser/EditBoutDialog";
import { MatchSuggestionsPanel } from "@/components/organiser/MatchSuggestionsPanel";
import { ManageTicketsPanel } from "@/components/organiser/ManageTicketsPanel";
import { AddFightSlotDialog } from "@/components/organiser/AddFightSlotDialog";
import { ArrowLeft, Globe, Pencil, Plus, Sparkles, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { formatEnum } from "@/lib/format";

type FighterProfile = Database["public"]["Tables"]["fighter_profiles"]["Row"];

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

const STATUS_PILL: Record<string, { label: string; className: string }> = {
  proposed: { label: "Proposed", className: "bg-primary/15 text-primary border-primary/30" },
  confirmed: { label: "Confirmed", className: "bg-green-500/15 text-green-400 border-green-500/30" },
  declined: { label: "Declined", className: "bg-destructive/15 text-destructive border-destructive/30" },
  empty: { label: "Empty", className: "bg-muted text-muted-foreground" },
};

interface BoutBannerProps {
  bout: any;
  onEdit: (b: any) => void;
  onTogglePublic: (id: string, val: boolean) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

function BoutBanner({ bout, onEdit, onTogglePublic, onMoveUp, onMoveDown, isFirst, isLast }: BoutBannerProps) {
  const fA = unwrap(bout.fighter_a);
  const fB = unwrap(bout.fighter_b);
  const isMain = bout.bout_type === "Main Event";
  const status = bout.status || "empty";
  const pill = STATUS_PILL[status] || STATUS_PILL.empty;

  return (
    <div className={`rounded-lg border ${isMain ? "border-2 border-primary/30" : "border-border"} bg-card ${isMain ? "p-6" : "p-4"}`}>
      <div className="flex items-center gap-3">
        {/* Up/Down arrows */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={isFirst} onClick={() => onMoveUp(bout.id)}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={isLast} onClick={() => onMoveDown(bout.id)}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {fA?.profile_image && (
                <div className={`${isMain ? "h-14 w-14" : "h-10 w-10"} rounded-full overflow-hidden border border-primary/20 shrink-0`}>
                  <img src={fA.profile_image} alt={fA.name} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="flex-1 text-left min-w-0">
                <p className={`font-heading ${isMain ? "text-xl" : "text-sm"} text-foreground uppercase truncate`}>
                  {fA?.name ?? "TBA"}
                </p>
                {fA && (
                  <p className={`${isMain ? "text-primary font-bold" : "text-xs text-muted-foreground"}`}>
                    {fA.record_wins}-{fA.record_losses}-{fA.record_draws}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-center px-3 shrink-0">
                <span className={`font-heading text-primary ${isMain ? "text-xl" : "text-xs"}`}>VS</span>
                {bout.weight_class && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{WEIGHT_CLASS_LABELS[bout.weight_class] || bout.weight_class}</p>
                )}
              </div>

              <div className="flex-1 text-right min-w-0">
                <p className={`font-heading ${isMain ? "text-xl" : "text-sm"} text-foreground uppercase truncate`}>
                  {fB?.name ?? "TBA"}
                </p>
                {fB && (
                  <p className={`${isMain ? "text-primary font-bold" : "text-xs text-muted-foreground"}`}>
                    {fB.record_wins}-{fB.record_losses}-{fB.record_draws}
                  </p>
                )}
              </div>
              {fB?.profile_image && (
                <div className={`${isMain ? "h-14 w-14" : "h-10 w-10"} rounded-full overflow-hidden border border-primary/20 shrink-0`}>
                  <img src={fB.profile_image} alt={fB.name} className="h-full w-full object-cover" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <Badge variant="outline" className={`text-[10px] ${pill.className}`}>{pill.label}</Badge>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onTogglePublic(bout.id, !bout.is_public)} title={bout.is_public !== false ? "Make unlisted" : "Make public"}>
                {bout.is_public !== false ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(bout)}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventManager() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showEditEvent, setShowEditEvent] = useState(false);
  const [showAddMain, setShowAddMain] = useState(false);
  const [showAddUnder, setShowAddUnder] = useState(false);
  const [editingBout, setEditingBout] = useState<any>(null);
  const [showSuggestionsMain, setShowSuggestionsMain] = useState(false);
  const [showSuggestionsUnder, setShowSuggestionsUnder] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [mainPage, setMainPage] = useState(0);
  const [underPage, setUnderPage] = useState(0);
  const BOUTS_PER_PAGE = 5;

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["organiser-event", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: slots = [] } = useQuery({
    queryKey: ["event-slots", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("fight_slots").select("*").eq("event_id", id!).order("slot_number");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: bouts = [], refetch: refetchBouts } = useQuery({
    queryKey: ["event-fight-slots-manager", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_fight_slots")
        .select("*, fighter_a:fighter_profiles!event_fight_slots_fighter_a_id_fkey(id, name, record_wins, record_losses, record_draws, weight_class, profile_image, user_id, created_by_coach_id), fighter_b:fighter_profiles!event_fight_slots_fighter_b_id_fkey(id, name, record_wins, record_losses, record_draws, weight_class, profile_image, user_id, created_by_coach_id)")
        .eq("event_id", id!)
        .order("slot_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const mainBouts = useMemo(() => bouts.filter((b: any) => b.bout_type === "Main Event"), [bouts]);
  const underBouts = useMemo(() => bouts.filter((b: any) => b.bout_type !== "Main Event"), [bouts]);

  const mainTotal = Math.ceil(mainBouts.length / BOUTS_PER_PAGE);
  const underTotal = Math.ceil(underBouts.length / BOUTS_PER_PAGE);
  const paginatedMain = mainBouts.slice(mainPage * BOUTS_PER_PAGE, (mainPage + 1) * BOUTS_PER_PAGE);
  const paginatedUnder = underBouts.slice(underPage * BOUTS_PER_PAGE, (underPage + 1) * BOUTS_PER_PAGE);

  const publishMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").update({ status: "published" }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organiser-event", id] });
      toast({ title: "Event published" });
    },
  });

  const handleTogglePublic = async (boutId: string, val: boolean) => {
    await supabase.from("event_fight_slots").update({ is_public: val }).eq("id", boutId);
    refetchBouts();
  };

  const handleMoveBout = async (boutId: string, direction: "up" | "down", section: "main" | "under") => {
    const items = section === "main" ? [...mainBouts] : [...underBouts];
    const idx = items.findIndex((b: any) => b.id === boutId);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    // Swap slot_numbers
    const slotA = items[idx].slot_number;
    const slotB = items[swapIdx].slot_number;
    await Promise.all([
      supabase.from("event_fight_slots").update({ slot_number: slotB }).eq("id", items[idx].id),
      supabase.from("event_fight_slots").update({ slot_number: slotA }).eq("id", items[swapIdx].id),
    ]);
    refetchBouts();
  };

  const handleBoutSuccess = () => {
    refetchBouts();
    queryClient.invalidateQueries({ queryKey: ["event-confirmed-bouts", id] });
  };

  const handleSuggestionConfirm = async (fighterA: FighterProfile, fighterB: FighterProfile, section: "main" | "under") => {
    const nextSlot = bouts.length + 1;
    const wc = fighterA.weight_class || fighterB.weight_class;
    const { data: inserted } = await supabase.from("event_fight_slots").insert({
      event_id: id!,
      slot_number: nextSlot,
      fighter_a_id: fighterA.id,
      fighter_b_id: fighterB.id,
      weight_class: wc,
      bout_type: section === "main" ? "Main Event" : "Undercard",
      status: "proposed",
      is_public: false,
    }).select("id").single();

    if (inserted) {
      const notifyIds = new Set<string>();
      if (fighterA.user_id) notifyIds.add(fighterA.user_id);
      if (fighterB.user_id) notifyIds.add(fighterB.user_id);
      if (fighterA.created_by_coach_id) notifyIds.add(fighterA.created_by_coach_id);
      if (fighterB.created_by_coach_id) notifyIds.add(fighterB.created_by_coach_id);
      const { data: gymLinks } = await supabase
        .from("fighter_gym_links").select("fighter_id, gym:gyms(coach_id)")
        .in("fighter_id", [fighterA.id, fighterB.id]).eq("status", "approved");
      (gymLinks ?? []).forEach((link: any) => {
        const gym = Array.isArray(link.gym) ? link.gym[0] : link.gym;
        if (gym?.coach_id) notifyIds.add(gym.coach_id);
      });
      const promises = Array.from(notifyIds).map((uid) =>
        supabase.rpc("create_notification", {
          _user_id: uid,
          _title: "New Fight Proposal",
          _message: `${fighterA.name} vs ${fighterB.name} has been proposed for ${event?.title ?? "an event"}.`,
          _type: "match_proposed" as any,
          _reference_id: inserted.id,
        })
      );
      await Promise.all(promises);
    }

    toast({ title: "Fight proposed — awaiting acceptance from all parties" });
    refetchBouts();
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16"><div className="container py-16"><div className="animate-pulse text-muted-foreground">Loading event...</div></div></main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-16"><div className="container py-16 text-center">
          <p className="text-muted-foreground">Event not found.</p>
          <Button variant="outline" asChild className="mt-4"><Link to="/organiser/dashboard">Back to Dashboard</Link></Button>
        </div></main>
      </div>
    );
  }

  const STATUS_COLORS: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    published: "bg-green-500/20 text-green-400 border-green-500/30",
    completed: "bg-secondary/20 text-secondary",
    cancelled: "bg-destructive/20 text-destructive",
  };

  const PaginationBar = ({ page: p, total, setPage: sp }: { page: number; total: number; setPage: (n: number) => void }) => {
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

  const existingFighterIds = bouts.flatMap((b: any) => [b.fighter_a_id, b.fighter_b_id].filter(Boolean));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container">
            <Link to="/organiser/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>

            <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="font-heading text-4xl text-foreground">{event.title}</h1>
                  <Badge variant="outline" className={STATUS_COLORS[event.status] || ""}>{event.status}</Badge>
                </div>
                <p className="text-muted-foreground">
                  {new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {event.location} · {event.country}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowEditEvent(true)}>
                  <Pencil className="h-3 w-3" /> Edit Event
                </Button>
                {event.status === "draft" && (
                  <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending} className="gap-2">
                    <Globe className="h-4 w-4" />{publishMutation.isPending ? "Publishing..." : "Publish Event"}
                  </Button>
                )}
              </div>
            </div>

            {event.description && <p className="text-muted-foreground mb-8 max-w-2xl">{event.description}</p>}

            {/* MAIN CARD */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-2xl text-foreground">MAIN <span className="text-primary">CARD</span></h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAddMain(true)}>
                    <Plus className="h-3 w-3" /> Add Fight Manually
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowSuggestionsMain(!showSuggestionsMain)}>
                    <Sparkles className="h-3 w-3" /> Get Match Suggestions
                  </Button>
                </div>
              </div>

              {showSuggestionsMain && slots.length > 0 && (
                <div className="mb-4">
                  <MatchSuggestionsPanel
                    slot={slots[0]}
                    existingProposalFighterIds={existingFighterIds}
                    onSelectPair={(a, b) => handleSuggestionConfirm(a, b, "main")}
                    eventId={id}
                  />
                  <Button variant="ghost" size="sm" onClick={() => setShowSuggestionsMain(false)} className="mt-2">Close</Button>
                </div>
              )}

              {mainBouts.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 border border-dashed border-border rounded-md text-center">No main card bouts yet.</p>
              ) : (
                <div className="space-y-3">
                  {paginatedMain.map((bout: any, idx: number) => (
                    <BoutBanner
                      key={bout.id}
                      bout={bout}
                      onEdit={setEditingBout}
                      onTogglePublic={handleTogglePublic}
                      onMoveUp={(id) => handleMoveBout(id, "up", "main")}
                      onMoveDown={(id) => handleMoveBout(id, "down", "main")}
                      isFirst={mainPage * BOUTS_PER_PAGE + idx === 0}
                      isLast={mainPage * BOUTS_PER_PAGE + idx === mainBouts.length - 1}
                    />
                  ))}
                </div>
              )}
              <PaginationBar page={mainPage} total={mainTotal} setPage={setMainPage} />
            </div>

            {/* UNDERCARD */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-2xl text-foreground">UNDER<span className="text-primary">CARD</span></h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAddUnder(true)}>
                    <Plus className="h-3 w-3" /> Add Fight Manually
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowSuggestionsUnder(!showSuggestionsUnder)}>
                    <Sparkles className="h-3 w-3" /> Get Match Suggestions
                  </Button>
                </div>
              </div>

              {showSuggestionsUnder && slots.length > 0 && (
                <div className="mb-4">
                  <MatchSuggestionsPanel
                    slot={slots[0]}
                    existingProposalFighterIds={existingFighterIds}
                    onSelectPair={(a, b) => handleSuggestionConfirm(a, b, "under")}
                    eventId={id}
                  />
                  <Button variant="ghost" size="sm" onClick={() => setShowSuggestionsUnder(false)} className="mt-2">Close</Button>
                </div>
              )}

              {underBouts.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 border border-dashed border-border rounded-md text-center">No undercard bouts yet.</p>
              ) : (
                <div className="space-y-2">
                  {paginatedUnder.map((bout: any, idx: number) => (
                    <BoutBanner
                      key={bout.id}
                      bout={bout}
                      onEdit={setEditingBout}
                      onTogglePublic={handleTogglePublic}
                      onMoveUp={(id) => handleMoveBout(id, "up", "under")}
                      onMoveDown={(id) => handleMoveBout(id, "down", "under")}
                      isFirst={underPage * BOUTS_PER_PAGE + idx === 0}
                      isLast={underPage * BOUTS_PER_PAGE + idx === underBouts.length - 1}
                    />
                  ))}
                </div>
              )}
              <PaginationBar page={underPage} total={underTotal} setPage={setUnderPage} />
            </div>

            {/* Tickets Panel */}
            <div className="mb-10">
              <ManageTicketsPanel eventId={id!} />
            </div>

            {/* Dialogs */}
            <AddFightManuallyDialog
              open={showAddMain}
              onOpenChange={setShowAddMain}
              eventId={id!}
              sectionType="Main Event"
              nextSlotNumber={bouts.length + 1}
              onSuccess={handleBoutSuccess}
              existingProposalFighterIds={existingFighterIds}
              fightSlot={slots.length > 0 ? slots[0] : null}
            />
            <AddFightManuallyDialog
              open={showAddUnder}
              onOpenChange={setShowAddUnder}
              eventId={id!}
              sectionType="Undercard"
              nextSlotNumber={bouts.length + 1}
              onSuccess={handleBoutSuccess}
              existingProposalFighterIds={existingFighterIds}
              fightSlot={slots.length > 0 ? slots[0] : null}
            />
            {editingBout && (
              <EditBoutDialog
                open={!!editingBout}
                onOpenChange={(open) => { if (!open) setEditingBout(null); }}
                bout={editingBout}
                onSuccess={handleBoutSuccess}
              />
            )}
            {showEditEvent && event && (
              <EditEventDialog
                open={showEditEvent}
                onOpenChange={setShowEditEvent}
                event={event}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ["organiser-event", id] })}
                onDelete={() => navigate("/organiser/dashboard")}
              />
            )}
            <AddFightSlotDialog
              open={showAddSlot}
              onOpenChange={setShowAddSlot}
              eventId={id!}
              nextSlotNumber={slots.length + 1}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ["event-slots", id] })}
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
