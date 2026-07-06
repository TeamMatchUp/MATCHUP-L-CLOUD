import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

const FEATURES = [
  "Priority matchmaking suggestions",
  "Advanced fight analytics & win probability",
  "Featured placement in fighter search",
  "Unlimited match proposals",
  "Verified profile badge",
  "Email & DM notifications",
];

type Plan = { id: "pro_monthly" | "pro_yearly"; label: string; price: string; sub: string };

const PLANS: Plan[] = [
  { id: "pro_monthly", label: "Monthly", price: "£9.99", sub: "per month" },
  { id: "pro_yearly", label: "Annual", price: "£99", sub: "per year — save 2 months" },
];

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Plan | null>(null);

  const startCheckout = (p: Plan) => {
    if (!user) {
      navigate("/auth?redirect=/pricing");
      return;
    }
    setSelected(p);
  };

  return (
    <div className="min-h-screen" style={{ background: "#080a0d" }}>
      <SEO title="MatchUp Pro Subscription | Pricing" description="Unlock priority matchmaking, advanced analytics, and featured placement with MatchUp Pro." canonicalPath="/pricing" />
      <PaymentTestModeBanner />
      <Header />
      <main className="pt-16 pb-20">
        <div className="container" style={{ maxWidth: 900 }}>
          <div style={{ textAlign: "center", padding: "40px 0 32px" }}>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, letterSpacing: "0.03em", color: "#e8eaf0" }}>
              MATCHUP <span style={{ color: "#e8a020" }}>PRO</span>
            </h1>
            <p style={{ fontSize: 16, color: "#8b909e", marginTop: 8 }}>
              For serious fighters and coaches who want the edge.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {PLANS.map((p) => (
              <div key={p.id} style={{
                background: "#111318", borderRadius: 12, padding: 28,
                boxShadow: "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#e8a020", letterSpacing: "0.05em" }}>{p.label}</div>
                <div style={{ marginTop: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, color: "#e8eaf0" }}>{p.price}</span>
                </div>
                <div style={{ fontSize: 12, color: "#8b909e", marginBottom: 20 }}>{p.sub}</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
                  {FEATURES.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#e8eaf0", marginBottom: 10 }}>
                      <Check style={{ width: 16, height: 16, color: "#e8a020", flexShrink: 0 }} /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => startCheckout(p)}
                  style={{
                    width: "100%", padding: "12px 0", background: "#e8a020", color: "#080a0d",
                    fontWeight: 700, fontSize: 14, borderRadius: 8, border: "none", cursor: "pointer",
                  }}
                >
                  Subscribe {p.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent style={{ maxWidth: "min(90vw, 960px)", maxHeight: "88vh", overflowY: "auto", background: "#111318" }}>
          <DialogTitle style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "#e8eaf0" }}>
            SUBSCRIBE TO MATCHUP PRO
          </DialogTitle>
          {selected && user && (
            <StripeEmbeddedCheckout
              mode="subscription"
              priceId={selected.id}
              userId={user.id}
              customerEmail={user.email ?? undefined}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
