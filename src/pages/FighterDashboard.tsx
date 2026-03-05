import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

export default function FighterDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container">
            <h1 className="font-heading text-4xl md:text-5xl text-foreground mb-2">
              FIGHTER <span className="text-primary">PORTAL</span>
            </h1>
            <p className="text-muted-foreground mb-8">
              Your fight proposals, upcoming bouts, and profile.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "Match Proposals", value: "0", sub: "Pending your decision" },
                { label: "Upcoming Fights", value: "0", sub: "Confirmed matchups" },
                { label: "Profile Views", value: "—", sub: "Coming soon" },
              ].map((card) => (
                <div key={card.label} className="rounded-lg border border-border bg-card p-6">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="font-heading text-3xl text-foreground mt-1">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-2">{card.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
