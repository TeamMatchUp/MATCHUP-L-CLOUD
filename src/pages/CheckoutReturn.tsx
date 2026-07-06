import { useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CheckCircle2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useEffect } from "react";
import { setBasket } from "@/pages/Checkout";

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  useEffect(() => {
    // Clear the basket after a successful purchase
    if (sessionId) setBasket([]);
  }, [sessionId]);

  return (
    <div className="min-h-screen" style={{ background: "#080a0d" }}>
      <SEO title="Payment Successful | MatchUp" description="Your payment has been received." canonicalPath="/checkout/return" />
      <Header />
      <main className="pt-24 pb-16">
        <div className="container" style={{ maxWidth: 560, textAlign: "center" }}>
          <div style={{
            background: "#111318", borderRadius: 12, padding: 40,
            boxShadow: "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}>
            <CheckCircle2 style={{ width: 56, height: 56, color: "#22c55e", margin: "0 auto 16px" }} />
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: "0.03em", color: "#e8eaf0", marginBottom: 8 }}>
              PAYMENT <span style={{ color: "#e8a020" }}>RECEIVED</span>
            </h1>
            <p style={{ fontSize: 14, color: "#8b909e", marginBottom: 20 }}>
              Thanks — you'll receive a confirmation shortly.
            </p>
            {sessionId && (
              <p style={{ fontSize: 11, color: "#555b6b", marginBottom: 20, wordBreak: "break-all" }}>
                Reference: {sessionId}
              </p>
            )}
            <Link
              to="/dashboard"
              style={{
                display: "inline-block", padding: "12px 24px",
                background: "#e8a020", color: "#080a0d", fontWeight: 700, fontSize: 14,
                borderRadius: 8, textDecoration: "none",
              }}
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
