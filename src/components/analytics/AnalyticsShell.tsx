import { ReactNode, useState } from "react";

export interface KPI {
  label: string;
  value: string | number;
  sub?: string;
  /** 0-100 progress bar shown beneath the value */
  progress?: number;
}

export interface AnalyticsTab {
  value: string;
  label: string;
  content: ReactNode;
}

interface AnalyticsShellProps {
  title?: string;
  kpis: KPI[];
  tabs: AnalyticsTab[];
  defaultTab?: string;
  emptyState?: ReactNode;
}

const CARD_BG = "hsl(var(--card))";
const PAGE_BG = "hsl(var(--background))";
const GOLD = "hsl(var(--primary))";
const GOLD_DIM = "rgba(239,68,68,0.12)";
const TEXT_MUTED = "hsl(var(--muted-foreground))";
const RAISED = "hsl(var(--muted))";

const CARD_SHADOW =
  "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)";

export function KpiCard({ kpi }: { kpi: KPI }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 h-full"
      style={{ background: CARD_BG, boxShadow: CARD_SHADOW }}
    >
      <div
        className="text-[10px] font-bold uppercase"
        style={{ color: TEXT_MUTED, letterSpacing: "1.5px", fontFamily: "Inter, sans-serif" }}
      >
        {kpi.label}
      </div>
      <div
        className="leading-none"
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 36,
          letterSpacing: "0.04em",
          color: GOLD,
        }}
      >
        {kpi.value}
      </div>
      {typeof kpi.progress === "number" && (
        <div
          className="h-1.5 w-full rounded-full overflow-hidden mt-1"
          style={{ background: GOLD_DIM }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.max(0, Math.min(100, kpi.progress))}%`,
              background: GOLD,
            }}
          />
        </div>
      )}
      {kpi.sub && (
        <div
          className="text-[11px] mt-auto"
          style={{ color: TEXT_MUTED, fontFamily: "Inter, sans-serif" }}
        >
          {kpi.sub}
        </div>
      )}
    </div>
  );
}

export function AnalyticsCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl p-5 h-full ${className}`}
      style={{ background: CARD_BG, boxShadow: CARD_SHADOW }}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                letterSpacing: "0.08em",
                fontSize: 16,
                color: "hsl(var(--foreground))",
              }}
            >
              {title.toUpperCase()}
            </h3>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function ProgressRow({
  label,
  value,
  max,
  rightLabel,
}: {
  label: string;
  value: number;
  max: number;
  rightLabel?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[12px]" style={{ color: "hsl(var(--foreground))", fontFamily: "Inter, sans-serif" }}>
        <span className="truncate pr-3">{label}</span>
        <span style={{ color: TEXT_MUTED }}>{rightLabel ?? `${value}/${max}`}</span>
      </div>
      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: GOLD_DIM }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: GOLD }} />
      </div>
    </div>
  );
}

export function PillToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-full p-1" style={{ background: RAISED }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="px-3 py-1 text-[11px] font-semibold rounded-full transition-colors"
            style={{
              background: active ? GOLD : "transparent",
              color: active ? "hsl(var(--background))" : TEXT_MUTED,
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.04em",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function AnalyticsShell({
  title = "Analytics",
  kpis,
  tabs,
  defaultTab,
  emptyState,
}: AnalyticsShellProps) {
  const [active, setActive] = useState<string>(defaultTab ?? tabs[0]?.value ?? "");
  const current = tabs.find((t) => t.value === active) ?? tabs[0];

  return (
    <div
      className="w-full"
      style={{ background: PAGE_BG, fontFamily: "Inter, sans-serif" }}
    >
      {title && (
        <h1
          className="mb-5"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 40,
            letterSpacing: "0.04em",
            color: "hsl(var(--foreground))",
          }}
        >
          {title.toUpperCase()}
        </h1>
      )}

      {kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {kpis.map((k, i) => (
            <KpiCard key={i} kpi={k} />
          ))}
        </div>
      )}

      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {tabs.map((t) => {
            const isActive = t.value === current?.value;
            return (
              <button
                key={t.value}
                onClick={() => setActive(t.value)}
                className="px-5 py-2 rounded-full text-[12px] font-semibold transition-colors"
                style={{
                  background: isActive ? GOLD : RAISED,
                  color: isActive ? "hsl(var(--background))" : TEXT_MUTED,
                  fontFamily: "Inter, sans-serif",
                  letterSpacing: "0.04em",
                  boxShadow: isActive
                    ? "0 2px 8px rgba(239,68,68,0.25)"
                    : "inset 0 1px 0 rgba(255,255,255,0.03)",
                }}
              >
                {t.label.toUpperCase()}
              </button>
            );
          })}
        </div>
      )}

      <div>{emptyState ?? current?.content}</div>
    </div>
  );
}

export const ANALYTICS_TOKENS = {
  GOLD,
  GOLD_DIM,
  CARD_BG,
  PAGE_BG,
  TEXT_MUTED,
  RAISED,
  CARD_SHADOW,
};
