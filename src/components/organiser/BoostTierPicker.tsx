import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { BOOST_TIERS, type BoostTierId } from "@/lib/boostTiers";

interface Props {
  initial?: BoostTierId;
  onConfirm: (tier: BoostTierId) => void;
  onCancel: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  isSubmitting?: boolean;
}

export function BoostTierPicker({
  initial = "7d",
  onConfirm,
  onCancel,
  primaryLabel = "Continue to Payment",
  secondaryLabel = "Cancel",
  isSubmitting,
}: Props) {
  const [selected, setSelected] = useState<BoostTierId>(initial);

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {BOOST_TIERS.map((tier) => {
          const active = selected === tier.id;
          return (
            <button
              type="button"
              key={tier.id}
              onClick={() => setSelected(tier.id)}
              style={{
                position: "relative",
                background: active ? "rgba(239,68,68,0.12)" : "#181c24",
                color: "#e8eaf0",
                borderRadius: 12,
                padding: "16px 14px",
                textAlign: "left",
                cursor: "pointer",
                border: "none",
                boxShadow: active
                  ? "inset 0 0 0 2px #ef4444, 0 0 18px rgba(239,68,68,0.18)"
                  : "inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)",
                transition: "all 0.15s ease",
              }}
            >
              {tier.badge && (
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#0d0f12",
                    background: "#ef4444",
                    padding: "2px 6px",
                    borderRadius: 999,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  {tier.badge}
                </span>
              )}
              {active && (
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#ef4444",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check style={{ width: 12, height: 12, color: "#0d0f12" }} />
                </span>
              )}
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 24,
                    letterSpacing: "0.04em",
                    color: "#e8eaf0",
                    lineHeight: 1,
                  }}
                >
                  {tier.label}
                </div>
                <div style={{ fontSize: 11, color: "#8b909e", marginTop: 4 }}>{tier.duration} of top placement</div>
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 28,
                  color: "#ef4444",
                  lineHeight: 1,
                  letterSpacing: "0.02em",
                }}
              >
                £{tier.price.toFixed(2)}
              </div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 20,
          justifyContent: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{
            background: "transparent",
            color: "#8b909e",
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
          }}
        >
          {secondaryLabel}
        </button>
        <button
          type="button"
          onClick={() => onConfirm(selected)}
          disabled={isSubmitting}
          style={{
            background: "#ef4444",
            color: "#0d0f12",
            padding: "10px 22px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            border: "none",
            boxShadow: "0 0 14px rgba(239,68,68,0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          <Sparkles style={{ width: 14, height: 14 }} /> {primaryLabel}
        </button>
      </div>
    </div>
  );
}
