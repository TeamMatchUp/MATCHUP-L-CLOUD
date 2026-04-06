import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  eventId: string;
  confirmedCount: number;
  openSlotCount: number;
}

export function EventKpiStrip({ eventId, confirmedCount, openSlotCount }: Props) {
  const { data: ticketData } = useQuery({
    queryKey: ["event-kpi-tickets", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tickets")
        .select("quantity_available, price")
        .eq("event_id", eventId);
      if (!data || data.length === 0) return { totalCapacity: 0, estRevenue: 0 };
      let totalCapacity = 0;
      let estRevenue = 0;
      data.forEach((t) => {
        const qty = t.quantity_available ?? 0;
        const price = Number(t.price) || 0;
        totalCapacity += qty;
        estRevenue += qty * price;
      });
      return { totalCapacity, estRevenue };
    },
    enabled: !!eventId,
  });

  const formatCurrency = (v: number) =>
    "£" + v.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const kpis = [
    {
      label: "Tickets Available",
      value: ticketData ? String(ticketData.totalCapacity) : "—",
      color: "#e8a020",
    },
    {
      label: "Est. Revenue",
      value: ticketData ? formatCurrency(ticketData.estRevenue) : "—",
      color: "#22c55e",
    },
    { label: "Matched Fights", value: String(confirmedCount), color: "#e8eaf0" },
    { label: "Open Slots", value: String(openSlotCount), color: "#e8eaf0" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          style={{
            background: "#14171e",
            borderRadius: 12,
            padding: "20px 16px",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <p
            style={{
              fontSize: 11,
              color: "#8b909e",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {kpi.label}
          </p>
          <p
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 32,
              color: kpi.color,
              lineHeight: 1,
            }}
          >
            {kpi.value}
          </p>
        </div>
      ))}
    </div>
  );
}
