interface Row { label: string; value: string | null | undefined }

export function EventDetailsCard({ rows }: { rows: Row[] }) {
  const filtered = rows.filter((r) => r.value);
  if (filtered.length === 0) return null;
  return (
    <div
      className="rounded-xl bg-card"
      style={{
        padding: "18px 20px",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <h3
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          letterSpacing: "0.08em",
          fontSize: 13,
          color: "hsl(var(--primary))",
          marginBottom: 12,
        }}
      >
        EVENT DETAILS
      </h3>
      <dl className="space-y-2.5">
        {filtered.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-muted-foreground">{r.label}</dt>
            <dd className="text-sm font-semibold text-foreground text-right truncate">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
