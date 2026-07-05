import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { format } from "date-fns";
import {
  AnalyticsShell,
  AnalyticsCard,
  ProgressRow,
  ANALYTICS_TOKENS,
  KPI,
} from "@/components/analytics/AnalyticsShell";

interface OrganiserAnalyticsProps {
  userId: string;
  /** kept for backward compatibility — no longer rendered differently */
  embedded?: boolean;
  title?: string;
}

export function OrganiserAnalyticsShared({ userId, title = "Analytics" }: OrganiserAnalyticsProps) {
  const now = new Date();

  const { data: orgEvents = [] } = useQuery({
    queryKey: ["org-analytics-events", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("organiser_id", userId)
        .order("date", { ascending: false });
      return data ?? [];
    },
  });

  const eventIds = orgEvents.map((e) => e.id);

  const { data: orgFightSlots = [] } = useQuery({
    queryKey: ["org-analytics-efs", userId, eventIds.join(",")],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data } = await supabase
        .from("event_fight_slots")
        .select("*")
        .in("event_id", eventIds);
      return data ?? [];
    },
    enabled: eventIds.length > 0,
  });

  const { data: orgSuggestions = [] } = useQuery({
    queryKey: ["org-analytics-suggestions", userId, eventIds.join(",")],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data } = await supabase
        .from("match_suggestions")
        .select("*")
        .in("event_id", eventIds);
      return data ?? [];
    },
    enabled: eventIds.length > 0,
  });

  const { data: orgTickets = [] } = useQuery({
    queryKey: ["org-analytics-tickets", userId, eventIds.join(",")],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data } = await supabase.from("tickets").select("*").in("event_id", eventIds);
      return data ?? [];
    },
    enabled: eventIds.length > 0,
  });

  // ── KPIs ──
  const totalEvents = orgEvents.length;
  const totalSlots = orgFightSlots.length;
  const confirmedBouts = orgFightSlots.filter((s) => s.status === "confirmed").length;
  const fillRate = totalSlots > 0 ? Math.round((confirmedBouts / totalSlots) * 100) : 0;
  const pendingProposals = orgSuggestions.filter(
    (s) => s.status === "suggested" || s.status === "pending"
  ).length;
  const fightersConfirmed = new Set([
    ...orgFightSlots.filter((s) => s.status === "confirmed" && s.fighter_a_id).map((s) => s.fighter_a_id),
    ...orgFightSlots.filter((s) => s.status === "confirmed" && s.fighter_b_id).map((s) => s.fighter_b_id),
  ]).size;
  const fightersTarget = totalSlots * 2;
  const fightersConfirmedPct =
    fightersTarget > 0 ? Math.round((fightersConfirmed / fightersTarget) * 100) : 0;

  const kpis: KPI[] = [
    { label: "Total Events", value: totalEvents, sub: "Lifetime events" },
    {
      label: "Slots Filled",
      value: `${fillRate}%`,
      progress: fillRate,
      sub: `${confirmedBouts} of ${totalSlots} confirmed`,
    },
    { label: "Pending Proposals", value: pendingProposals, sub: "Awaiting response" },
    {
      label: "Fighters Confirmed",
      value: fightersConfirmed,
      progress: fightersConfirmedPct,
      sub: `of ${fightersTarget} slot seats`,
    },
  ];

  // ── Tab 1: Overview — per-event cards ──
  const eventSummaries = useMemo(() => {
    return orgEvents.map((e) => {
      const slots = orgFightSlots.filter((s) => s.event_id === e.id);
      const conf = slots.filter((s) => s.status === "confirmed").length;
      const tickets = orgTickets.filter((t) => t.event_id === e.id);
      const ticketTypes = tickets.length;
      return {
        id: e.id,
        title: e.title || "Untitled event",
        date: e.date,
        status: e.status,
        soldOut: !!e.sold_out,
        ticketEnabled: !!e.ticket_enabled,
        slots: slots.length,
        confirmed: conf,
        slotsPct: slots.length > 0 ? Math.round((conf / slots.length) * 100) : 0,
        ticketTypes,
      };
    });
  }, [orgEvents, orgFightSlots, orgTickets]);

  const overview = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {eventSummaries.length === 0 ? (
        <AnalyticsCard>
          <p className="text-sm" style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
            No events created yet.
          </p>
        </AnalyticsCard>
      ) : (
        eventSummaries.map((e) => (
          <AnalyticsCard key={e.id}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h4
                  className="truncate"
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 18,
                    color: "hsl(var(--foreground))",
                    letterSpacing: "0.04em",
                  }}
                >
                  {e.title.toUpperCase()}
                </h4>
                <p className="text-[11px] mt-1" style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
                  {e.date ? format(new Date(e.date), "d MMM yyyy") : "—"}
                </p>
              </div>
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                style={{
                  background:
                    e.status === "published"
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(139,144,158,0.15)",
                  color: e.status === "published" ? "#22c55e" : ANALYTICS_TOKENS.TEXT_MUTED,
                  letterSpacing: "0.08em",
                }}
              >
                {(e.status || "draft").toUpperCase()}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <ProgressRow
                label="Slots filled"
                value={e.confirmed}
                max={Math.max(e.slots, 1)}
                rightLabel={`${e.confirmed}/${e.slots} (${e.slotsPct}%)`}
              />
              <div className="flex items-center justify-between text-[12px]" style={{ color: "hsl(var(--foreground))" }}>
                <span>Ticketing</span>
                <span style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
                  {e.soldOut
                    ? "Sold out"
                    : e.ticketEnabled
                    ? `${e.ticketTypes} type${e.ticketTypes === 1 ? "" : "s"} on sale`
                    : "Not enabled"}
                </span>
              </div>
            </div>
          </AnalyticsCard>
        ))
      )}
    </div>
  );

  // ── Tab 2: Matchmaking ──
  const suggestionsGenerated = orgSuggestions.length;
  const suggestionsConfirmed = orgSuggestions.filter((s) => s.status === "confirmed").length;
  const suggestionsDeclined = orgSuggestions.filter(
    (s) => s.status === "dismissed" || s.status === "declined"
  ).length;
  const acceptanceRate =
    suggestionsGenerated > 0
      ? Math.round((suggestionsConfirmed / suggestionsGenerated) * 100)
      : 0;
  const avgComposite =
    suggestionsGenerated > 0
      ? (
          orgSuggestions.reduce((sum, s) => sum + (Number(s.composite_score) || 0), 0) /
          suggestionsGenerated
        ).toFixed(2)
      : "0.00";

  const matchmaking = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <AnalyticsCard title="Proposal Funnel">
        <div className="flex flex-col gap-4">
          <FunnelRow label="Suggestions Generated" value={suggestionsGenerated} max={suggestionsGenerated} />
          <FunnelRow label="Confirmed" value={suggestionsConfirmed} max={suggestionsGenerated} />
          <FunnelRow label="Declined" value={suggestionsDeclined} max={suggestionsGenerated} />
        </div>
      </AnalyticsCard>

      <div className="grid grid-cols-1 gap-4">
        <AnalyticsCard title="Acceptance Rate">
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 40,
              color: ANALYTICS_TOKENS.GOLD,
              letterSpacing: "0.04em",
            }}
          >
            {acceptanceRate}%
          </div>
          <div className="mt-3">
            <ProgressRow
              label="Confirmed of total"
              value={suggestionsConfirmed}
              max={Math.max(suggestionsGenerated, 1)}
              rightLabel={`${suggestionsConfirmed}/${suggestionsGenerated}`}
            />
          </div>
        </AnalyticsCard>

        <AnalyticsCard title="Avg Composite Score">
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 40,
              color: ANALYTICS_TOKENS.GOLD,
              letterSpacing: "0.04em",
            }}
          >
            {avgComposite}
          </div>
          <p className="text-[12px] mt-2" style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
            Average match quality across all suggestions
          </p>
        </AnalyticsCard>
      </div>
    </div>
  );

  // ── Tab 3: Events table ──
  const events = (
    <AnalyticsCard title="Per-Event Slot Breakdown">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]" style={{ color: "hsl(var(--foreground))" }}>
          <thead>
            <tr
              className="text-[10px] uppercase"
              style={{ color: ANALYTICS_TOKENS.TEXT_MUTED, letterSpacing: "0.08em" }}
            >
              <th className="py-2 pr-3 font-semibold">Event</th>
              <th className="py-2 pr-3 font-semibold">Date</th>
              <th className="py-2 pr-3 font-semibold text-right">Total</th>
              <th className="py-2 pr-3 font-semibold text-right">Confirmed</th>
              <th className="py-2 pr-3 font-semibold text-right">Pending</th>
              <th className="py-2 pr-3 font-semibold text-right">Open</th>
              <th className="py-2 font-semibold text-right">Fill %</th>
            </tr>
          </thead>
          <tbody>
            {orgEvents.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center" style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
                  No events to display.
                </td>
              </tr>
            )}
            {orgEvents.map((e) => {
              const slots = orgFightSlots.filter((s) => s.event_id === e.id);
              const conf = slots.filter((s) => s.status === "confirmed").length;
              const pend = slots.filter(
                (s) => s.status === "proposed" || s.status === "pending"
              ).length;
              const open = slots.length - conf - pend;
              const pct = slots.length > 0 ? Math.round((conf / slots.length) * 100) : 0;
              return (
                <tr
                  key={e.id}
                  className="border-t"
                  style={{ borderColor: "rgba(255,255,255,0.04)" }}
                >
                  <td className="py-3 pr-3">{e.title || "Untitled"}</td>
                  <td className="py-3 pr-3" style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
                    {e.date ? format(new Date(e.date), "d MMM yyyy") : "—"}
                  </td>
                  <td className="py-3 pr-3 text-right">{slots.length}</td>
                  <td className="py-3 pr-3 text-right" style={{ color: "#22c55e" }}>
                    {conf}
                  </td>
                  <td className="py-3 pr-3 text-right" style={{ color: "#f59e0b" }}>
                    {pend}
                  </td>
                  <td className="py-3 pr-3 text-right" style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
                    {open}
                  </td>
                  <td
                    className="py-3 text-right font-semibold"
                    style={{ color: ANALYTICS_TOKENS.GOLD }}
                  >
                    {pct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AnalyticsCard>
  );

  return (
    <AnalyticsShell
      title={title}
      kpis={kpis}
      tabs={[
        { value: "overview", label: "Overview", content: overview },
        { value: "matchmaking", label: "Matchmaking", content: matchmaking },
        { value: "events", label: "Events", content: events },
      ]}
    />
  );
}

function FunnelRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="flex items-center justify-between text-[12px]"
        style={{ color: "hsl(var(--foreground))" }}
      >
        <span>{label}</span>
        <span style={{ color: ANALYTICS_TOKENS.TEXT_MUTED }}>
          {value} <span className="ml-1" style={{ color: ANALYTICS_TOKENS.GOLD }}>{pct}%</span>
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full overflow-hidden"
        style={{ background: ANALYTICS_TOKENS.GOLD_DIM }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: ANALYTICS_TOKENS.GOLD }}
        />
      </div>
    </div>
  );
}
