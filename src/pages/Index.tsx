import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { TwoSidedSection } from "@/components/landing/TwoSidedSection";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_DASHBOARDS: Record<string, string> = {
  organiser: "/organiser/dashboard",
  gym_owner: "/gym-owner/dashboard",
  fighter: "/fighter/dashboard",
  admin: "/organiser/dashboard",
  coach: "/gym-owner/dashboard",
};

const Index = () => {
  const { user, activeRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && activeRole) {
      navigate(ROLE_DASHBOARDS[activeRole] || "/fighter/dashboard", { replace: true });
    }
  }, [loading, user, activeRole, navigate]);

  if (loading || (user && activeRole)) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <HeroSection />
        <TwoSidedSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
