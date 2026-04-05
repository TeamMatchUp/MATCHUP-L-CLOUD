import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  const [showPayment, setShowPayment] = useState(false);
  const total = basket.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const removeItem = (index: number) => {
    setBasket(basket.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen" style={{ background: "#0d0f12" }}>
      <Header />
      <main className="pt-20 pb-16">
        <div className="container" style={{ maxWidth: 640 }}>
          <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Continue Shopping
          </Button>

          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#e8eaf0", marginBottom: 24 }}>
            YOUR <span style={{ color: "#e8a020" }}>BASKET</span>
          </h1>

          {basket.length === 0 ? (
            <div style={{ background: "#111318", borderRadius: 12, padding: 40, textAlign: "center" }}>
              <ShoppingCart style={{ width: 40, height: 40, color: "#555b6b", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 15, color: "#8b909e" }}>Your basket is empty</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {basket.map((item, i) => (
                  <div key={i} className="flex items-center justify-between" style={{
                    background: "#111318", borderRadius: 8, padding: "16px 20px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "#e8eaf0" }}>{item.ticket_type}</p>
                      {item.event_title && <p style={{ fontSize: 11, color: "#8b909e" }}>{item.event_title}</p>}
                      <p style={{ fontSize: 12, color: "#8b909e", marginTop: 2 }}>Qty: {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span style={{ fontSize: 18, fontWeight: 700, color: "#e8a020" }}>£{(item.price * item.quantity).toFixed(2)}</span>
                      <button onClick={() => removeItem(i)} style={{ color: "#ef4444", cursor: "pointer" }}>
                        <Trash2 style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between" style={{ marginTop: 20, padding: "16px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: "#e8eaf0" }}>Total</span>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#e8a020" }}>£{total.toFixed(2)}</span>
              </div>

              {showPayment ? (
                <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "16px 20px", marginTop: 16, textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "#f59e0b", fontWeight: 600 }}>Payment processing coming soon</p>
                  <p style={{ fontSize: 12, color: "#8b909e", marginTop: 4 }}>Stripe integration will be available in a future update.</p>
                </div>
              ) : (
                <button
                  onClick={() => setShowPayment(true)}
                  style={{
                    width: "100%", marginTop: 16, padding: "14px 0",
                    background: "#e8a020", color: "#0d0f12", fontWeight: 700, fontSize: 15,
                    borderRadius: 8, cursor: "pointer", border: "none",
                    boxShadow: "0 0 12px rgba(232,160,32,0.25)",
                  }}
                >
                  Proceed to Payment
                </button>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
