import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EditEventDialog } from "@/components/organiser/EditEventDialog";
import { ManageTicketsPanel } from "@/components/organiser/ManageTicketsPanel";
import { BoostPurchaseDialog } from "@/components/organiser/BoostPurchaseDialog";
import { BoostedBadge } from "@/components/BoostedBadge";
import { useActiveBoost } from "@/hooks/useActiveBoost";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  ArrowLeft, Pencil, Eye, Share2, Calendar, MapPin, Building2,
  CheckCircle2, Circle, Ticket, TrendingUp, Users, AlertCircle,
  ChevronRight, Plus, Trophy, PoundSterling, X, Copy, Check, Sparkles, Globe, Trash2,
} from "lucide-react";
import { formatEnum } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


// ─── Design tokens ──────────────────────────────────────────
const PAGE_BG = "hsl(var(--background))";
const CARD = "hsl(var(--card))";
const RAISED = "hsl(var(--muted))";
const ACCENT = "hsl(var(--primary))";
const ACCENT_DIM = "rgba(239,68,68,0.12)";
const TEXT = "hsl(var(--foreground))";
const TEXT_SEC = "hsl(var(--muted-foreground))";
const TEXT_MUTED = "hsl(var(--muted-foreground))";
const SUCCESS = "hsl(var(--success))";
const WARNING = "#f59e0b";
const DANGER = "hsl(var(--primary))";

const CARD_SHADOW =
  "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)";

const cardStyle: React.CSSProperties = {
  background: CARD,
  borderRadius: 16,
  padding: 20,
  boxShadow: CARD_SHADOW,
};

// ─── Helpers ────────────────────────────────────────────────
const fmtGBP = (v: number) =>
  "£" + v.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function unwrap<T>(val: T | T[] | null | undefined): T | null {
  if (Array.isArray(val)) return val[0] ?? null;
  return val ?? null;
}

// ─── Sub-components ─────────────────────────────────────────
function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <h2 style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 18, color: TEXT, letterSpacing: "0.04em", textTransform: "uppercase",
      }}>{children}</h2>
      {action}
    </div>
  );
}

function ProgressBar({ pct, color = ACCENT }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
      <div style={{
        width: `${Math.max(0, Math.min(100, pct))}%`,
        height: "100%", background: color, borderRadius: 999,
        transition: "width 0.3s ease",
      }} />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const isPublished = status === "published";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
      background: isPublished ? "rgba(34,197,94,0.14)" : "rgba(245,158,11,0.14)",
      color: isPublished ? SUCCESS : WARNING,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor" }} />
      {status}
    </span>
  );
}

function GhostButton({ children, onClick, href, icon: Icon }: {
  children: React.ReactNode; onClick?: () => void; href?: string; icon?: any;
}) {
  const style: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "9px 14px", fontSize: 13, fontWeight: 600, borderRadius: 10,
    background: RAISED, color: TEXT, border: "none", cursor: "pointer",
    textDecoration: "none", transition: "background 0.15s",
  };
  const onEnter = (e: any) => (e.currentTarget.style.background = "hsl(var(--muted))");
  const onLeave = (e: any) => (e.currentTarget.style.background = RAISED);
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>
        {Icon && <Icon className="h-3.5 w-3.5" />} {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {Icon && <Icon className="h-3.5 w-3.5" />} {children}
    </button>
  );
}

function GoldButton({ children, onClick, icon: Icon, size = "md" }: {
  children: React.ReactNode; onClick?: () => void; icon?: any; size?: "sm" | "md";
}) {
  const style: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: size === "sm" ? "7px 12px" : "9px 14px",
    fontSize: size === "sm" ? 12 : 13, fontWeight: 700, borderRadius: 10,
    background: ACCENT, color: "hsl(var(--primary-foreground))", border: "none", cursor: "pointer",
    boxShadow: "0 0 16px rgba(239,68,68,0.25)", transition: "background 0.15s",
  };
  return (
    <button onClick={onClick} style={style}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#c47e10")}
      onMouseLeave={(e) => (e.currentTarget.style.background = ACCENT)}>
      {Icon && <Icon className="h-3.5 w-3.5" />} {children}
    </button>
  );
}

// ─── Page ───────────────────────────────────────────────────
export default function EventManager() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { track } = useAnalytics();

  const [showEditEvent, setShowEditEvent] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showBoost, setShowBoost] = useState(false);
  const { data: activeBoost } = useActiveBoost(id);


  useEffect(() => {
    if (id) void track("event_hub_opened", { event_id: id });
  }, [id]);

  const { data: event, isLoading } = useQuery({
    queryKey: ["organiser-event", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: bouts = [] } = useQuery({
    queryKey: ["event-fight-slots-manager", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_fight_slots")
        .select("*, fighter_a:fighter_profiles!event_fight_slots_fighter_a_id_fkey(id, name, record_wins, record_losses, record_draws, weight_class), fighter_b:fighter_profiles!event_fight_slots_fighter_b_id_fkey(id, name, record_wins, record_losses, record_draws, weight_class)")
        .eq("event_id", id!)
        .order("slot_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["event-tickets", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tickets").select("*").eq("event_id", id!).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  // Derived metrics
  const metrics = useMemo(() => {
    const totalCapacity = tickets.reduce((s: number, t: any) => s + (t.quantity_available ?? 0), 0);
    const estRevenue = tickets.reduce((s: number, t: any) => s + (t.quantity_available ?? 0) * (Number(t.price) || 0), 0);
    const totalSlots = bouts.length;
    const confirmed = bouts.filter((b: any) => b.status === "confirmed" && b.fighter_a_id && b.fighter_b_id).length;
    const open = bouts.filter((b: any) => !b.fighter_a_id || !b.fighter_b_id).length;
    const main = bouts.filter((b: any) => b.bout_type === "Main Event");
    const under = bouts.filter((b: any) => b.bout_type !== "Main Event");
    return { totalCapacity, estRevenue, totalSlots, confirmed, open, main, under };
  }, [tickets, bouts]);

  // Progress checklist
  const checklist = useMemo(() => {
    const hasDetails = !!(event && event.title && event.date && event.venue_name);
    const buildPct = metrics.totalSlots > 0 ? 100 : 0;
    const mmPct = metrics.totalSlots > 0 ? Math.round((metrics.confirmed / metrics.totalSlots) * 100) : 0;
    const hasTickets = tickets.length > 0;
    const isPublished = event?.status === "published";
    return [
      { label: "Event details", done: hasDetails, info: hasDetails ? "Completed" : "Add details" },
      { label: "Build fight card", done: buildPct === 100, info: `${metrics.totalSlots} slots` },
      { label: "Matchmaking", done: metrics.totalSlots > 0 && metrics.confirmed === metrics.totalSlots, info: `${metrics.confirmed} / ${metrics.totalSlots}` },
      { label: "Tickets & pricing", done: hasTickets, info: hasTickets ? "Completed" : "Add tickets" },
      { label: "Publish event", done: isPublished, info: isPublished ? "Completed" : "Draft" },
    ];
  }, [event, tickets, metrics]);
  const completedSteps = checklist.filter((c) => c.done).length;
  const overallPct = Math.round((completedSteps / checklist.length) * 100);

  // Recent activity (synthesised from existing data)
  const activity = useMemo(() => {
    const items: { icon: any; title: string; subtitle: string; ts: string; color: string }[] = [];
    bouts.slice(-6).forEach((b: any) => {
      const fA = unwrap(b.fighter_a);
      const fB = unwrap(b.fighter_b);
      if (b.status === "confirmed" && fA && fB) {
        items.push({
          icon: CheckCircle2, color: SUCCESS,
          title: "Match confirmed",
          subtitle: `${fA.name} vs ${fB.name}`,
          ts: b.updated_at || b.created_at,
        });
      } else if (fA || fB) {
        items.push({
          icon: Plus, color: ACCENT,
          title: "Fight added to card",
          subtitle: formatEnum(b.weight_class || "") + " bout",
          ts: b.created_at,
        });
      }
    });
    if (event?.status === "published") {
      items.push({
        icon: TrendingUp, color: ACCENT,
        title: "Event published",
        subtitle: `${event.title} is now live`,
        ts: event.updated_at,
      });
    }
    return items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 5);
  }, [bouts, event]);

  if (isLoading || !event) {
    return (
      <div className="min-h-screen" style={{ background: PAGE_BG }}>
        <Header />
        <main className="pt-16"><div className="container py-6 md:py-10"><div className="animate-pulse" style={{ color: TEXT_SEC }}>Loading event…</div></div></main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      <Header />
      <main className="pt-16">
        <section style={{ padding: "24px 0 64px" }}>
          <div className="container" style={{ paddingLeft: 24, paddingRight: 24, maxWidth: 1400 }}>
            {/* Back link */}
            <div className="mb-5">
              <Link to="/organiser/dashboard" className="inline-flex items-center gap-2 text-sm" style={{ color: TEXT_SEC }}>
                <ArrowLeft className="h-4 w-4" /> Back to Events
              </Link>
            </div>

            {/* TOP BAR */}
            <div style={{ ...cardStyle, padding: 20, marginBottom: 20 }}>
              <div className="flex items-start gap-4 flex-wrap">
                {event.banner_image ? (
                  <div style={{ width: 180, height: 120, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: RAISED }}>
                    <img src={event.banner_image} alt={event.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ) : (
                  <div style={{ width: 180, height: 120, borderRadius: 12, background: RAISED, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Trophy style={{ color: TEXT_MUTED }} className="h-8 w-8" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <h1 className="truncate" style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: "clamp(1.75rem, 4vw, 2.4rem)",
                      color: TEXT, textTransform: "uppercase", lineHeight: 1.05,
                      letterSpacing: "0.02em",
                    }}>{event.title}</h1>
                    <StatusPill status={event.status} />
                    {activeBoost && <BoostedBadge size="md" />}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap mb-2" style={{ fontSize: 13, color: TEXT_SEC }}>
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    {event.city && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{event.city}</span>}
                    {event.venue_name && <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{event.venue_name}</span>}
                  </div>
                  {event.description && (
                    <p style={{ fontSize: 13, color: TEXT_SEC, maxWidth: 640 }} className="line-clamp-2">{event.description}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap" style={{ alignSelf: "flex-start" }}>
                  {event.status === "published" && (
                    <GoldButton icon={Sparkles} onClick={() => setShowBoost(true)}>
                      {activeBoost ? "Extend Boost" : "Boost This Event"}
                    </GoldButton>
                  )}
                  <GhostButton icon={Eye} href={`/events/${id}?preview=true`}>Preview Public Page</GhostButton>
                  <GhostButton icon={Share2} onClick={() => setShowShare(true)}>Share Event</GhostButton>
                  <GoldButton icon={Pencil} onClick={() => setShowEditEvent(true)}>Edit Event Details</GoldButton>
                </div>
              </div>
            </div>

            {activeBoost && (
              <div style={{
                ...cardStyle, padding: "12px 16px", marginBottom: 20,
                display: "flex", alignItems: "center", gap: 12,
                background: "rgba(239,68,68,0.06)",
                boxShadow: "inset 0 0 0 1px rgba(239,68,68,0.18), 0 2px 8px rgba(0,0,0,0.3)",
              }}>
                <Sparkles style={{ color: ACCENT, width: 18, height: 18 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>This event is currently boosted</p>
                  <p style={{ fontSize: 11, color: TEXT_SEC }}>
                    Boost expires {new Date(activeBoost.expires_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button onClick={() => setShowBoost(true)} style={{ background: "transparent", color: ACCENT, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none" }}>Extend</button>
              </div>
            )}

            {/* KPI STRIP */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {[
                { label: "Tickets Available", value: metrics.totalCapacity.toLocaleString("en-GB"), sub: `${tickets.length} tier${tickets.length === 1 ? "" : "s"}`, pct: metrics.totalCapacity > 0 ? 100 : 0, color: ACCENT, icon: Ticket },
                { label: "Est. Revenue", value: fmtGBP(metrics.estRevenue), sub: "Projected", pct: metrics.estRevenue > 0 ? 100 : 0, color: SUCCESS, icon: PoundSterling },
                { label: "Matched Fights", value: `${metrics.confirmed}`, sub: `/ ${metrics.totalSlots} slots`, pct: metrics.totalSlots > 0 ? (metrics.confirmed / metrics.totalSlots) * 100 : 0, color: ACCENT, icon: Users },
                { label: "Open Slots", value: `${metrics.open}`, sub: `/ ${metrics.totalSlots} slots`, pct: metrics.totalSlots > 0 ? (metrics.open / metrics.totalSlots) * 100 : 0, color: DANGER, icon: AlertCircle },
              ].map((kpi) => (
                <div key={kpi.label} style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: ACCENT_DIM, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <kpi.icon style={{ color: ACCENT }} className="h-3.5 w-3.5" />
                    </div>
                    <span style={{ fontSize: 11, color: TEXT_SEC, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{kpi.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: TEXT, lineHeight: 1 }}>{kpi.value}</span>
                    <span style={{ fontSize: 12, color: TEXT_MUTED }}>{kpi.sub}</span>
                  </div>
                  <ProgressBar pct={kpi.pct} color={kpi.color} />
                </div>
              ))}
            </div>

            {/* MAIN GRID */}
            <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))" }}>
              {/* Event Progress */}
              <div style={cardStyle}>
                <SectionTitle>Event Progress</SectionTitle>
                <div className="space-y-2">
                  {checklist.map((row) => (
                    <div key={row.label} className="flex items-center justify-between" style={{ padding: "10px 12px", background: RAISED, borderRadius: 10 }}>
                      <div className="flex items-center gap-3">
                        {row.done ? <CheckCircle2 className="h-4 w-4" style={{ color: SUCCESS }} /> : <Circle className="h-4 w-4" style={{ color: TEXT_MUTED }} />}
                        <span style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{row.label}</span>
                      </div>
                      <span style={{ fontSize: 12, color: row.done ? SUCCESS : TEXT_SEC, fontWeight: 600 }}>{row.info}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2" style={{ fontSize: 12, color: TEXT_SEC }}>
                    <span>{completedSteps} of {checklist.length} completed</span>
                    <span style={{ color: ACCENT, fontWeight: 700 }}>{overallPct}%</span>
                  </div>
                  <ProgressBar pct={overallPct} />
                </div>
              </div>

              {/* Fight Card Overview */}
              <div style={cardStyle}>
                <SectionTitle action={
                  <GhostButton icon={Pencil} onClick={() => navigate(`/organiser/events/${id}/fight-card`)}>Edit Fight Card</GhostButton>
                }>Fight Card Overview</SectionTitle>
                {[
                  { label: "Main Card", bouts: metrics.main },
                  { label: "Undercard", bouts: metrics.under },
                ].map((sec) => {
                  const total = sec.bouts.length;
                  const confirmed = sec.bouts.filter((b: any) => b.status === "confirmed" && b.fighter_a_id && b.fighter_b_id).length;
                  const pct = total > 0 ? (confirmed / total) * 100 : 0;
                  return (
                    <div key={sec.label} className="mb-4 last:mb-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <p style={{ fontSize: 14, color: TEXT, fontWeight: 600 }}>{sec.label}</p>
                          <p style={{ fontSize: 11, color: TEXT_MUTED }}>{total} slot{total === 1 ? "" : "s"}</p>
                        </div>
                        <span style={{ fontSize: 13, color: TEXT_SEC, fontWeight: 600 }}>{confirmed} / {total}</span>
                      </div>
                      <ProgressBar pct={pct} />
                    </div>
                  );
                })}
              </div>

              {/* Recent Matchups */}
              <div style={cardStyle}>
                <SectionTitle action={
                  <GhostButton onClick={() => navigate(`/organiser/events/${id}/fight-card`)}>View all matchups</GhostButton>
                }>Recent Matchups</SectionTitle>
                <div className="space-y-2">
                  {bouts.slice(0, 4).map((b: any) => {
                    const fA = unwrap(b.fighter_a);
                    const fB = unwrap(b.fighter_b);
                    const isEmpty = !fA || !fB;
                    return (
                      <div key={b.id} className="flex items-center justify-between gap-3" style={{ padding: "12px", background: RAISED, borderRadius: 10 }}>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
                            {formatEnum(b.weight_class || "Open")}
                          </p>
                          <div className="flex items-center gap-2" style={{ fontSize: 13, color: TEXT }}>
                            <span className="truncate font-medium">{fA?.name || "TBD"}</span>
                            <span style={{ color: TEXT_MUTED }}>vs</span>
                            <span className="truncate font-medium">{fB?.name || "TBD"}</span>
                          </div>
                          {!isEmpty && (
                            <p style={{ fontSize: 11, color: TEXT_SEC, marginTop: 2 }}>
                              {fA?.record_wins ?? 0}-{fA?.record_losses ?? 0}-{fA?.record_draws ?? 0} · {fB?.record_wins ?? 0}-{fB?.record_losses ?? 0}-{fB?.record_draws ?? 0}
                            </p>
                          )}
                        </div>
                        {isEmpty ? (
                          <button onClick={() => navigate(`/organiser/events/${id}/fight-card`)} style={{
                            padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 8,
                            background: "transparent", color: ACCENT, border: `1px solid ${ACCENT_DIM}`,
                            cursor: "pointer",
                          }}>Find Match</button>
                        ) : (
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6,
                            background: b.status === "confirmed" ? "rgba(34,197,94,0.14)" : "rgba(245,158,11,0.14)",
                            color: b.status === "confirmed" ? SUCCESS : WARNING,
                            textTransform: "uppercase", letterSpacing: "0.04em",
                          }}>{b.status || "pending"}</span>
                        )}
                      </div>
                    );
                  })}
                  {bouts.length === 0 && (
                    <p style={{ fontSize: 13, color: TEXT_MUTED, textAlign: "center", padding: "24px 0" }}>No matchups yet.</p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <span className="inline-flex items-center gap-2" style={{ fontSize: 12, color: TEXT_SEC }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: ACCENT }} />
                    {metrics.open} open slots remaining
                  </span>
                  <GoldButton size="sm" onClick={() => navigate(`/organiser/events/${id}/fight-card`)}>
                    Go to Matchmaking <ChevronRight className="h-3.5 w-3.5" />
                  </GoldButton>
                </div>
              </div>

              {/* Ticket Sales */}
              <div style={cardStyle}>
                <SectionTitle action={
                  <GhostButton icon={Pencil} onClick={() => setShowTickets((s) => !s)}>Manage Tickets</GhostButton>
                }>Ticket Sales</SectionTitle>
                <div className="space-y-2">
                  {tickets.length === 0 && (
                    <p style={{ fontSize: 13, color: TEXT_MUTED, textAlign: "center", padding: "24px 0" }}>No ticket tiers yet.</p>
                  )}
                  {tickets.map((t: any) => {
                    const qty = t.quantity_available ?? 0;
                    const sub = qty * (Number(t.price) || 0);
                    const sharePct = metrics.estRevenue > 0 ? Math.round((sub / metrics.estRevenue) * 100) : 0;
                    return (
                      <div key={t.id} className="flex items-center justify-between gap-3" style={{ padding: "10px 12px", background: RAISED, borderRadius: 10 }}>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: 13, color: TEXT, fontWeight: 600 }} className="truncate">{t.ticket_type}</p>
                          <p style={{ fontSize: 11, color: TEXT_SEC }}>{fmtGBP(Number(t.price) || 0)} · {qty.toLocaleString("en-GB")} available</p>
                        </div>
                        <span style={{ fontSize: 13, color: ACCENT, fontWeight: 700 }}>{sharePct}%</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <div>
                    <p style={{ fontSize: 11, color: TEXT_SEC, textTransform: "uppercase", letterSpacing: "0.06em" }}>Est. Revenue</p>
                    <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: SUCCESS, lineHeight: 1 }}>{fmtGBP(metrics.estRevenue)}</p>
                  </div>
                  <div className="text-right">
                    <p style={{ fontSize: 11, color: TEXT_SEC, textTransform: "uppercase", letterSpacing: "0.06em" }}>Avg Order Value</p>
                    <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: TEXT, lineHeight: 1 }}>
                      {fmtGBP(tickets.length > 0 ? metrics.estRevenue / Math.max(metrics.totalCapacity, 1) : 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Inline ticket management */}
            {showTickets && (
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <SectionTitle action={
                  <GhostButton onClick={() => setShowTickets(false)}>Close</GhostButton>
                }>Manage Tickets</SectionTitle>
                <ManageTicketsPanel eventId={id!} />
              </div>
            )}

            {/* BOTTOM ROW */}
            <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>
              {/* Event Information */}
              <div style={cardStyle}>
                <SectionTitle action={
                  <GhostButton icon={Pencil} onClick={() => setShowEditEvent(true)}>Edit</GhostButton>
                }>Event Information</SectionTitle>
                <div className="space-y-2">
                  {[
                    ["Date", new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })],
                    ["Venue", [event.venue_name, event.city].filter(Boolean).join(", ") || "—"],
                    ["Event Type", event.event_type ? formatEnum(event.event_type) : "—"],
                    ["Discipline", event.discipline ? formatEnum(event.discipline) : "—"],
                    ["Capacity", metrics.totalCapacity > 0 ? metrics.totalCapacity.toLocaleString("en-GB") : "—"],
                    ["Promotion", event.promotion_name || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-start justify-between gap-3" style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: 12, color: TEXT_SEC }}>{k}</span>
                      <span style={{ fontSize: 13, color: TEXT, textAlign: "right", maxWidth: "65%" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Summary */}
              <div style={cardStyle}>
                <SectionTitle>Financial Summary</SectionTitle>
                <div className="space-y-3">
                  <div className="flex items-center justify-between" style={{ padding: "10px 12px", background: RAISED, borderRadius: 10 }}>
                    <span style={{ fontSize: 12, color: TEXT_SEC }}>Total Revenue (Est.)</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: SUCCESS }}>{fmtGBP(metrics.estRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between" style={{ padding: "10px 12px", background: RAISED, borderRadius: 10 }}>
                    <span style={{ fontSize: 12, color: TEXT_SEC }}>Total Expenses</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: TEXT }}>{fmtGBP(0)}</span>
                  </div>
                  <div className="flex items-center justify-between" style={{ padding: "10px 12px", background: ACCENT_DIM, borderRadius: 10 }}>
                    <span style={{ fontSize: 12, color: TEXT_SEC }}>Net Profit (Est.)</span>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: ACCENT }}>{fmtGBP(metrics.estRevenue)}</span>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 12 }}>
                  Estimates based on current ticket inventory. Add expenses to refine net profit.
                </p>
              </div>

              {/* Recent Activity */}
              <div style={cardStyle}>
                <SectionTitle>Recent Activity</SectionTitle>
                <div className="space-y-2">
                  {activity.length === 0 && (
                    <p style={{ fontSize: 13, color: TEXT_MUTED, textAlign: "center", padding: "24px 0" }}>No recent activity.</p>
                  )}
                  {activity.map((a, i) => (
                    <div key={i} className="flex items-start gap-3" style={{ padding: "10px 12px", background: RAISED, borderRadius: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: ACCENT_DIM, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <a.icon style={{ color: a.color }} className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{a.title}</p>
                        <p style={{ fontSize: 11, color: TEXT_SEC }} className="truncate">{a.subtitle}</p>
                      </div>
                      <span style={{ fontSize: 11, color: TEXT_MUTED, whiteSpace: "nowrap" }}>{timeAgo(a.ts)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dialogs */}
            {showEditEvent && event && (
              <EditEventDialog
                open={showEditEvent}
                onOpenChange={setShowEditEvent}
                event={event}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ["organiser-event", id] })}
                onDelete={() => navigate("/organiser/dashboard")}
                onPublished={() => setShowBoost(true)}
              />
            )}
            {showShare && id && (
              <ShareEventModal eventId={id} title={event?.title} onClose={() => setShowShare(false)} />
            )}
            {id && (
              <BoostPurchaseDialog
                open={showBoost}
                onOpenChange={setShowBoost}
                eventId={id}
                mode={activeBoost ? "manage" : "upsell"}
              />
            )}

          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

// ─── Share Event Modal ──────────────────────────────────────
function ShareEventModal({ eventId, title, onClose }: { eventId: string; title?: string; onClose: () => void }) {
  const publicUrl = `${window.location.origin}/events/${eventId}`;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: CARD, borderRadius: 16,
          width: "min(90vw, 960px)", maxHeight: "88vh", overflowY: "auto",
          padding: 28,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 28, color: TEXT, letterSpacing: "0.04em",
              textTransform: "uppercase", lineHeight: 1.1,
            }}>
              Share Ev<span style={{ color: ACCENT }}>ent</span>
            </h2>
            {title && (
              <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }} className="truncate">{title}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 36, height: 36, borderRadius: 8, display: "flex",
              alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.04)", color: TEXT_SEC, cursor: "pointer", flexShrink: 0,
            }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div className="flex flex-col items-center" style={{ gap: 18 }}>
          <div style={{
            background: "#ffffff", borderRadius: 12, padding: 16,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)",
          }}>
            <QRCodeSVG value={publicUrl} size={220} bgColor="#ffffff" fgColor="hsl(var(--background))" level="M" includeMargin={false} />
          </div>
          <p style={{ fontSize: 13, color: TEXT_SEC, textAlign: "center" }}>
            Scan to open the public event page
          </p>

          <div className="w-full" style={{ maxWidth: 640 }}>
            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: TEXT_MUTED, textTransform: "uppercase" }}>
              Public link
            </label>
            <div className="flex items-stretch gap-2" style={{ marginTop: 8 }}>
              <input
                readOnly
                value={publicUrl}
                onFocus={(e) => e.currentTarget.select()}
                style={{
                  flex: 1, minWidth: 0,
                  background: RAISED, color: TEXT,
                  borderRadius: 8, padding: "10px 12px",
                  fontSize: 13, fontFamily: "Inter, sans-serif",
                  outline: "none", border: "none",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)",
                }}
                onFocusCapture={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px rgba(239,68,68,0.4)"; }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)"; }}
              />
              <GoldButton icon={copied ? Check : Copy} onClick={copy}>
                {copied ? "Copied!" : "Copy Link"}
              </GoldButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

