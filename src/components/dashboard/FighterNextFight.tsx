import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CalendarDays, MapPin, Scale, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FighterNextFight() {
  const { user } = useAuth();

  // Fighter profile
  const { data: fighterProfile } = useQuery({
    queryKey: ["fighter-next-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_profiles")
        .select("id, name, record_wins, record_losses, record_draws")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Get next confirmed fight slot
  const { data: nextFight } = useQuery({
    queryKey: ["fighter-next-fight", fighterProfile?.id],
    queryFn: async () => {
      if (!fighterProfile) return null;
      const today = new Date().toISOString().split("T")[0];
      const fid = fighterProfile.id;

      const { data: slotsA } = await supabase
        .from("event_fight_slots")
        .select("*, events(id, title, date, location, city, venue_name, tickets_url, ticket_url)")
        .eq("fighter_a_id", fid)
        .eq("status", "confirmed");

      const { data: slotsB } = await supabase
        .from("event_fight_slots")
        .select("*, events(id, title, date, location, city, venue_name, tickets_url, ticket_url)")
        .eq("fighter_b_id", fid)
        .eq("status", "confirmed");

      const all = [...(slotsA ?? []), ...(slotsB ?? [])]
        .filter((s) => s.events && s.events.date >= today)
        .sort((a, b) => a.events.date.localeCompare(b.events.date));

      return all[0] || null;
    },
    enabled: !!fighterProfile,
  });

  // Get opponent name
  const opponentId = useMemo(() => {
    if (!nextFight || !fighterProfile) return null;
    return nextFight.fighter_a_id === fighterProfile.id
      ? nextFight.fighter_b_id
      : nextFight.fighter_a_id;
  }, [nextFight, fighterProfile]);

  const { data: opponent } = useQuery({
    queryKey: ["fighter-next-opponent", opponentId],
    queryFn: async () => {
      if (!opponentId) return null;
      const { data } = await supabase
        .from("fighter_profiles")
        .select("id, name, record_wins, record_losses, record_draws")
        .eq("id", opponentId)
        .maybeSingle();
      return data;
    },
    enabled: !!opponentId,
  });

  if (!fighterProfile) return null;

  const formatRecord = (w: number, l: number, d: number) => `${w}-${l}-${d}`;

  const ticketUrl = nextFight?.events?.tickets_url || nextFight?.events?.ticket_url;
  const weightClass = nextFight?.weight_class
    ? nextFight.weight_class.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
    : null;

  return (
    <div className="coach-card">
      <div className="p-5">
        <h3 className="font-heading text-lg text-foreground mb-4">
          Next Upcoming <span className="text-primary">Fight</span>
        </h3>

        {!nextFight ? (
          <div className="rounded-lg border border-border bg-background p-8 text-center">
            <p className="text-sm text-muted-foreground">No upcoming fights scheduled.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Express interest in events to get matched.
            </p>
          </div>
        ) : (
          <>
            {/* Fight display block */}
            <div className="rounded-lg border border-border bg-background p-5 mb-4">
              <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                {nextFight.events?.title}
              </p>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-lg md:text-xl font-bold text-foreground">
                    {fighterProfile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRecord(fighterProfile.record_wins, fighterProfile.record_losses, fighterProfile.record_draws)}
                  </p>
                </div>
                <span className="font-heading text-2xl text-primary">VS</span>
                <div className="text-center">
                  <p className="text-lg md:text-xl font-bold text-foreground">
                    {opponent?.name || "TBA"}
                  </p>
                  {opponent && (
                    <p className="text-xs text-muted-foreground">
                      {formatRecord(opponent.record_wins, opponent.record_losses, opponent.record_draws)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Detail rows */}
            <div className="space-y-0">
              {[
                {
                  icon: CalendarDays,
                  label: "Date",
                  value: nextFight.events?.date
                    ? format(new Date(nextFight.events.date + "T00:00:00"), "MMMM d, yyyy")
                    : "TBA",
                },
                {
                  icon: MapPin,
                  label: "Location",
                  value: nextFight.events?.city || nextFight.events?.location || "TBA",
                },
                ...(weightClass
                  ? [{
                      icon: Scale,
                      label: "Weight",
                      value: weightClass,
                    }]
                  : []),
              ].map((row, i, arr) => (
                <div
                  key={row.label}
                  className="flex items-center gap-3 py-2.5"
                  style={{
                    borderBottom: i < arr.length - 1 ? "1px solid hsl(var(--border) / 0.5)" : "none",
                  }}
                >
                  <row.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground min-w-[70px]">
                    {row.label}
                  </span>
                  <span className="text-[13px] font-medium text-foreground">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Get Tickets */}
            {ticketUrl && (
              <Button
                className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/80 gap-2 font-semibold"
                asChild
              >
                <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
                  <Ticket className="h-4 w-4" />
                  Get Tickets
                </a>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
