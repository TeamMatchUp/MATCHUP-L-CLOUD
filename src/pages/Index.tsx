import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { TwoSidedSection } from "@/components/landing/TwoSidedSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FeaturedEventsSection } from "@/components/landing/FeaturedEventsSection";
import { FeaturedFightersSection } from "@/components/landing/FeaturedFightersSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <HeroSection />
        <TwoSidedSection />
        <HowItWorksSection />
        <FeaturedEventsSection />
        <FeaturedFightersSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
