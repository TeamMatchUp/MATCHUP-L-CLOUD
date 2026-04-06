import { useState, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditEventDialog } from "@/components/organiser/EditEventDialog";
import { EditBoutDialog } from "@/components/organiser/EditBoutDialog";
import { ManageTicketsPanel } from "@/components/organiser/ManageTicketsPanel";
import { AddFightModal } from "@/components/organiser/AddFightModal";
import { EventKpiStrip } from "@/components/organiser/EventKpiStrip";
import { ArrowLeft, Globe, Pencil, Plus, Eye, EyeOff, GripVertical, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { formatEnum } from "@/lib/format";

type FighterProfile = Database["public"]["Tables"]["fighter_profiles"]["Row"];

const WEIGHT_LBS: Record<string, number> = {
  strawweight: 115, flyweight: 125, bantamweight: 135, featherweight: 145,
  lightweight: 155, super_lightweight: 160, welterweight: 170, super_welterweight: 175,
  middleweight: 185, super_middleweight: 195, light_heavyweight: 205,
  cruiserweight: 224, heavyweight: 265, super_heavyweight: 300,
};

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

function weightDisplay(wc: string | null) {
  if (!wc) return "Open Weight";
  const label = WEIGHT_CLASS_LABELS[wc] || formatEnum(wc);
  const lbs = WEIGHT_LBS[wc];
  if (!lbs) return label;
  const kg = (lbs / 2.2046).toFixed(1);
  return `${label} · ${lbs}lbs / ${kg}kg`;
}

// ─── Slot Card ──────────────────────────────────────────────
interface SlotCardProps {
  bout: any;
  onEdit: (b: any) => void;
  onTogglePublic: (id: string, val: boolean) => void;
  onFindMatches: (b: any) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
}

function SlotCard({ bout, onEdit, onTogglePublic, onFindMatches, onDelete, onDragStart, onDragOver, onDrop }: SlotCardProps) {
  const fA = unwrap(bout.fighter_a);
  const fB = unwrap(bout.fighter_b);
  const status = bout.status || "empty";
  const isEmpty = !fA && !fB;
  const isConfirmed = status === "confirmed" && fA && fB;
  const isDeclined = status === "declined";
  const isPending = status === "proposed" || status === "pending";
  // Scenario detection based on ASSIGNMENT (not proposal status)
  const oneTBA = (bout.fighter_a_id && !bout.fighter_b_id) || (!bout.fighter_a_id && bout.fighter_b_id);
  const bothTBA = !bout.fighter_a_id && !bout.fighter_b_id;
  const hasTBA = oneTBA || bothTBA;

  let cardStyle: React.CSSProperties = {
    background: "#1a1e28",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 8,
    padding: "14px 16px",
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
    gap: 12,
    transition: "all 0.2s ease",
  };
  if (isConfirmed) {
    cardStyle.background = "rgba(232,160,32,0.08)";
    cardStyle.border = "1px solid rgba(232,160,32,0.3)";
  } else if (isDeclined) {
    cardStyle.border = "2px dashed rgba(239,68,68,0.5)";
    cardStyle.background = "rgba(239,68,68,0.04)";
  } else if (isPending) {
    cardStyle.border = "1px solid rgba(245,158,11,0.3)";
    cardStyle.background = "rgba(245,158,11,0.04)";
  }

  const statusBadge = (s: string) => {
    if (s === "confirmed") return <span style={{ fontSize: 10, background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 9999, padding: "1px 8px" }}>Confirmed</span>;
    if (s === "proposed" || s === "pending") return <span style={{ fontSize: 10, background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 9999, padding: "1px 8px" }}>Pending</span>;
    if (s === "declined") return <span style={{ fontSize: 10, background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 9999, padding: "1px 8px" }}>Declined</span>;
    return null;
  };

  const fighterBlock = (fighter: FighterProfile | null, side: "a" | "b", align: "left" | "right") => {
    const isAssigned = side === "a" ? !!bout.fighter_a_id : !!bout.fighter_b_id;
    return (
      <div style={{ flex: 1, textAlign: align, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 14, color: isAssigned ? "#e8eaf0" : "#555b6b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {fighter?.name ?? "TBA"}
        </p>
        {fighter && (
          <p style={{ fontSize: 11, color: "#8b909e", marginTop: 1 }}>
            {fighter.record_wins}-{fighter.record_losses}-{fighter.record_draws}
          </p>
        )}
        {isAssigned && statusBadge(status)}
        {!isAssigned && <span style={{ fontSize: 11, color: "#555b6b" }}>—</span>}
      </div>
    );
  };

  // Button label based on scenario
  const findLabel = oneTBA ? "Find Matches" : "Find Fights";

  return (
    <div
      style={cardStyle}
      draggable
      onDragStart={(e) => onDragStart(e, bout.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, bout.id)}
    >
      {/* Drag handle */}
      <div style={{ cursor: "grab", flexShrink: 0 }}>
        <GripVertical className="h-3.5 w-3.5" style={{ color: "#555b6b" }} />
      </div>

      {/* Centre content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Weight + discipline row */}
        <div style={{ fontSize: 12, color: "#8b909e", marginBottom: 4 }}>
          {weightDisplay(bout.weight_class)}
          {bout.discipline && <span style={{ marginLeft: 8, color: "#555b6b" }}>{formatEnum(bout.discipline)}</span>}
        </div>

        {/* Rounds row */}
        {bout.rounds && bout.round_duration_minutes && (
          <div style={{ fontSize: 11, color: "#555b6b", marginBottom: 6 }}>
            {bout.rounds} × {bout.round_duration_minutes} min rounds
          </div>
        )}

        {/* Fighters row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {fighterBlock(fA, "a", "left")}
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: "#e8a020", flexShrink: 0 }}>VS</span>
          {fighterBlock(fB, "b", "right")}
        </div>

        {isEmpty && (
          <p style={{ fontSize: 12, color: "#555b6b", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>EMPTY</p>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onTogglePublic(bout.id, !bout.is_public)}
          title={bout.is_public !== false ? "Make unlisted" : "Make public"}
        >
          {bout.is_public !== false ? <Eye className="h-3.5 w-3.5" style={{ color: "#8b909e" }} /> : <EyeOff className="h-3.5 w-3.5" style={{ color: "#8b909e" }} />}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(bout)}>
          <Pencil className="h-3.5 w-3.5" style={{ color: "#8b909e" }} />
        </Button>
        {hasTBA && (
          <button
            onClick={() => onFindMatches(bout)}
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#e8a020",
              background: "transparent",
              border: "1px solid rgba(232,160,32,0.3)",
              borderRadius: 6,
              padding: "3px 8px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(232,160,32,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {findLabel}
          </button>
        )}
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onDelete(bout.id)}>
          <Trash2 className="h-3.5 w-3.5" style={{ color: "#555b6b" }} />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function EventManager() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showEditEvent, setShowEditEvent] = useState(false);
  const [editingBout, setEditingBout] = useState<any>(null);
  const [addModal, setAddModal] = useState<{ open: boolean; section: "Main Event" | "Undercard"; mode: "add" | "find"; slot?: any }>({
    open: false, section: "Main Event", mode: "add",
  });
  const [dragId, setDragId] = useState<string | null>(null);

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

  const mainBouts = useMemo(() => bouts.filter((b: any) => b.bout_type === "Main Event" || b.slot_number === 1), [bouts]);
  const underBouts = useMemo(() => bouts.filter((b: any) => b.bout_type !== "Main Event" && b.slot_number !== 1), [bouts]);

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

  const handleDelete = async (boutId: string) => {
    await supabase.from("event_fight_slots").delete().eq("id", boutId);
    refetchBouts();
    toast({ title: "Slot removed" });
  };

  const handleBoutSuccess = () => {
    refetchBouts();
    queryClient.invalidateQueries({ queryKey: ["event-confirmed-bouts", id] });
  };

  // Drag and drop
  const handleDragStart = (e: React.DragEvent, boutId: string) => {
    setDragId(boutId);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;
    const dragBout = bouts.find((b: any) => b.id === dragId);
    const targetBout = bouts.find((b: any) => b.id === targetId);
    if (!dragBout || !targetBout) return;
    await Promise.all([
      supabase.from("event_fight_slots").update({ slot_number: targetBout.slot_number }).eq("id", dragId),
      supabase.from("event_fight_slots").update({ slot_number: dragBout.slot_number }).eq("id", targetId),
    ]);
    setDragId(null);
    refetchBouts();
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen" style={{ background: "#0d0f12" }}>
        <Header />
        <main className="pt-16"><div className="container py-16"><div className="animate-pulse" style={{ color: "#8b909e" }}>Loading event...</div></div></main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen" style={{ background: "#0d0f12" }}>
        <Header />
        <main className="pt-16"><div className="container py-16 text-center">
          <p style={{ color: "#8b909e" }}>Event not found.</p>
          <Button variant="outline" asChild className="mt-4"><Link to="/organiser/dashboard">Back to Dashboard</Link></Button>
        </div></main>
      </div>
    );
  }

  const existingFighterIds = bouts.flatMap((b: any) => [b.fighter_a_id, b.fighter_b_id].filter(Boolean));
  const confirmedCount = bouts.filter((b: any) => b.status === "confirmed" && b.fighter_a_id && b.fighter_b_id).length;
  const openSlotCount = bouts.filter((b: any) => !b.fighter_a_id || !b.fighter_b_id || b.status !== "confirmed").length;

  const STATUS_COLORS: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    published: "bg-green-500/20 text-green-400 border-green-500/30",
    completed: "bg-secondary/20 text-secondary",
    cancelled: "bg-destructive/20 text-destructive",
  };

  const sectionContainer = (isMain: boolean, children: React.ReactNode, sectionBouts: any[]) => (
    <div style={{
      background: "#14171e",
      border: isMain ? "1px solid rgba(232,160,32,0.2)" : "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 18,
          color: isMain ? "#e8a020" : "#e8eaf0",
          letterSpacing: "0.04em",
        }}>
          {isMain ? "MAIN CARD" : "UNDERCARD"}
        </h2>
        <button
          onClick={() => setAddModal({ open: true, section: isMain ? "Main Event" : "Undercard", mode: "add" })}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            cursor: "pointer",
            transition: "all 0.2s",
            ...(isMain
              ? { background: "#e8a020", color: "#0d0f12", border: "none", boxShadow: "0 0 12px rgba(232,160,32,0.25)" }
              : { background: "transparent", color: "#e8eaf0", border: "1px solid rgba(255,255,255,0.1)" }
            ),
          }}
          onMouseEnter={(e) => {
            if (isMain) e.currentTarget.style.background = "#c47e10";
            else e.currentTarget.style.borderColor = "rgba(232,160,32,0.3)";
          }}
          onMouseLeave={(e) => {
            if (isMain) e.currentTarget.style.background = "#e8a020";
            else e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          }}
        >
          <Plus className="h-3.5 w-3.5 inline mr-1" style={{ verticalAlign: "middle" }} />
          Add Fight
        </button>
      </div>

      {sectionBouts.length === 0 ? (
        <p style={{ fontSize: 13, color: "#555b6b", textAlign: "center", padding: "24px 0", borderTop: "1px dashed rgba(255,255,255,0.06)" }}>
          No {isMain ? "main card" : "undercard"} bouts yet.
        </p>
      ) : children}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#0d0f12" }}>
      <Header />
      <main className="pt-16">
        <section style={{ padding: "24px 0 64px" }}>
          <div className="container" style={{ paddingLeft: 35, paddingRight: 35 }}>
            <div className="flex items-center gap-4 mb-6">
              <Link to={`/events/${id}`} className="inline-flex items-center gap-2 text-sm hover:text-foreground" style={{ color: "#8b909e" }}>
                <ArrowLeft className="h-4 w-4" /> Back to Event
              </Link>
            </div>

            {/* KPI Strip */}
            <EventKpiStrip eventId={id!} confirmedCount={confirmedCount} openSlotCount={openSlotCount} />

            {/* Event header */}
            <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: "#e8eaf0", textTransform: "uppercase" }}>{event.title}</h1>
                  <Badge variant="outline" className={STATUS_COLORS[event.status] || ""}>{event.status}</Badge>
                </div>
                <p style={{ fontSize: 13, color: "#8b909e" }}>
                  {new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {event.location} · {event.country}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setShowEditEvent(true)} style={{
                  padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer",
                  background: "transparent", border: "1px solid rgba(232,160,32,0.4)", color: "#e8a020",
                  transition: "all 0.2s",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(232,160,32,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Pencil className="h-3 w-3 inline mr-1" /> Edit Event Details
                </button>
                {event.status === "draft" && (
                  <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending} className="gap-2">
                    <Globe className="h-4 w-4" />{publishMutation.isPending ? "Publishing..." : "Publish Event"}
                  </Button>
                )}
              </div>
            </div>

            {event.description && <p style={{ color: "#8b909e", marginBottom: 32, maxWidth: 640 }}>{event.description}</p>}

            {/* MAIN CARD */}
            {sectionContainer(true, (
              <div>
                {mainBouts.map((bout: any) => (
                  <SlotCard
                    key={bout.id}
                    bout={bout}
                    onEdit={setEditingBout}
                    onTogglePublic={handleTogglePublic}
                    onFindMatches={(b) => setAddModal({ open: true, section: "Main Event", mode: "find", slot: b })}
                    onDelete={handleDelete}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
                ))}
              </div>
            ), mainBouts)}

            {/* UNDERCARD */}
            {sectionContainer(false, (
              <div>
                {underBouts.map((bout: any) => (
                  <SlotCard
                    key={bout.id}
                    bout={bout}
                    onEdit={setEditingBout}
                    onTogglePublic={handleTogglePublic}
                    onFindMatches={(b) => setAddModal({ open: true, section: "Undercard", mode: "find", slot: b })}
                    onDelete={handleDelete}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  />
                ))}
              </div>
            ), underBouts)}

            {/* Tickets Panel */}
            <div className="mb-10">
              <ManageTicketsPanel eventId={id!} />
            </div>

            {/* Dialogs */}
            <AddFightModal
              open={addModal.open}
              onOpenChange={(v) => setAddModal((prev) => ({ ...prev, open: v }))}
              eventId={id!}
              sectionType={addModal.section}
              nextSlotNumber={bouts.length + 1}
              onSuccess={handleBoutSuccess}
              existingFighterIds={existingFighterIds}
              fightSlot={slots.length > 0 ? slots[0] : null}
              prefillSlot={addModal.slot}
              mode={addModal.mode}
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
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
