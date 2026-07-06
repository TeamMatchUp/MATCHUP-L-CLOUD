import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useAuth } from "@/contexts/AuthContext";

export interface BasketItem {
  ticket_type: string;
  price: number;
  quantity: number;
  event_id: string;
  event_title?: string;
}

// Simple global basket state
let globalBasket: BasketItem[] = [];
const listeners = new Set<() => void>();
export function getBasket() { return globalBasket; }
export function setBasket(items: BasketItem[]) {
  globalBasket = items;
  listeners.forEach(fn => fn());
}
export function addToBasket(item: BasketItem) {
  const existing = globalBasket.find(b => b.ticket_type === item.ticket_type && b.event_id === item.event_id);
  if (existing) {
    existing.quantity += item.quantity;
    globalBasket = [...globalBasket];
  } else {
    globalBasket = [...globalBasket, item];
  }
  listeners.forEach(fn => fn());
}
export function useBasket() {
  const [, setTick] = useState(0);
  useState(() => {
    const fn = () => setTick(t => t + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  });
  return globalBasket;
}
export function getBasketCount() {
  return globalBasket.reduce((sum, i) => sum + i.quantity, 0);
}

export default function Checkout() {
  const navigate = useNavigate();
  const basket = useBasket();
  const { user } = useAuth();
  const [showPayment, setShowPayment] = useState(false);
  const total = basket.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const removeItem = (index: number) => {
    setBasket(basket.filter((_, i) => i !== index));
  };

  const items = basket.map((b) => ({
    ticket_type: b.ticket_type,
    event_id: b.event_id,
    event_title: b.event_title,
    unit_amount: Math.round(b.price * 100),
    quantity: b.quantity,
  }));

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <Header />
      <main className="pt-20 pb-16">
        <div className="container" style={{ maxWidth: 960 }}>
          <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Continue Shopping
          </Button>

          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "hsl(var(--foreground))", marginBottom: 24 }}>
            YOUR <span style={{ color: "hsl(var(--primary))" }}>BASKET</span>
          </h1>

          {basket.length === 0 ? (
            <div style={{ background: "hsl(var(--card))", borderRadius: 12, padding: 40, textAlign: "center" }}>
              <ShoppingCart style={{ width: 40, height: 40, color: "hsl(var(--muted-foreground))", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 15, color: "hsl(var(--muted-foreground))" }}>Your basket is empty</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: showPayment ? "1fr 1fr" : "1fr", gap: 20 }}>
              <div>
                <div className="space-y-3">
                  {basket.map((item, i) => (
                    <div key={i} className="flex items-center justify-between" style={{
                      background: "hsl(var(--card))", borderRadius: 8, padding: "16px 20px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
                    }}>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: "hsl(var(--foreground))" }}>{item.ticket_type}</p>
                        {item.event_title && <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{item.event_title}</p>}
                        <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>Qty: {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span style={{ fontSize: 18, fontWeight: 700, color: "hsl(var(--primary))" }}>£{(item.price * item.quantity).toFixed(2)}</span>
                        {!showPayment && (
                          <button onClick={() => removeItem(i)} style={{ color: "hsl(var(--primary))", cursor: "pointer" }}>
                            <Trash2 style={{ width: 16, height: 16 }} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between" style={{ marginTop: 20, padding: "16px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: "hsl(var(--foreground))" }}>Total</span>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "hsl(var(--primary))" }}>£{total.toFixed(2)}</span>
                </div>

                {!showPayment && (
                  <button
                    onClick={() => setShowPayment(true)}
                    style={{
                      width: "100%", marginTop: 16, padding: "14px 0",
                      background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", fontWeight: 700, fontSize: 15,
                      borderRadius: 8, cursor: "pointer", border: "none",
                    }}
                  >
                    Proceed to Payment
                  </button>
                )}
              </div>

              {showPayment && (
                <div style={{ background: "hsl(var(--card))", borderRadius: 12, padding: 16 }}>
                  <StripeEmbeddedCheckout
                    mode="tickets"
                    items={items}
                    userId={user?.id}
                    customerEmail={user?.email ?? undefined}
                    returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
