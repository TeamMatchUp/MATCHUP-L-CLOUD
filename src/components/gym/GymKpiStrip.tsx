interface KpiStripProps {
  fighters: Array<{
    record_wins?: number | null;
    record_losses?: number | null;
    record_draws?: number | null;
  }>;
  upcomingEvents?: number | null;
}

interface Tile {
  value: string;
  label: string;
}

export function GymKpiStrip({ fighters, upcomingEvents }: KpiStripProps) {
  const w = fighters.reduce((s, f) => s + (f.record_wins ?? 0), 0);
  const l = fighters.reduce((s, f) => s + (f.record_losses ?? 0), 0);
  const d = fighters.reduce((s, f) => s + (f.record_draws ?? 0), 0);
  const total = w + l + d;
  const winRate = total > 0 ? Math.round((w / total) * 100) : null;
  const pro = fighters.filter((f) => (f.record_wins ?? 0) + (f.record_losses ?? 0) + (f.record_draws ?? 0) > 0).length;
  const rosterSize = fighters.length;

  const tiles: Tile[] = [
    { value: total > 0 ? `${w}-${l}-${d}` : "—", label: "Combined Record" },
    { value: winRate !== null ? `${winRate}%` : "—", label: "Win Rate" },
    { value: pro > 0 ? String(pro) : "—", label: "Pro Fighters" },
    { value: rosterSize > 0 ? String(rosterSize) : "—", label: "Roster Size" },
    { value: upcomingEvents != null ? String(upcomingEvents) : "—", label: "Upcoming Events" },
  ];

  return (
    <div
      className="rounded-xl bg-card"
      style={{ boxShadow: "var(--shadow-card)", padding: "18px 20px" }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {tiles.map((t) => (
          <div key={t.label} className="text-center">
            <p
              className="text-foreground"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, lineHeight: 1, letterSpacing: "0.01em" }}
            >
              {t.value}
            </p>
            <p
              className="mt-1 text-muted-foreground"
              style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}
            >
              {t.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
