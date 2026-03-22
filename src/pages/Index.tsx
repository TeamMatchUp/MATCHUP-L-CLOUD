import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { ThreeSidesSection } from "@/components/landing/ThreeSidesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PlatformStatsStrip } from "@/components/landing/PlatformStatsStrip";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <HeroSection />
        {/* Visual separator */}
        <div className="container">
          <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
        <ThreeSidesSection />
        <HowItWorksSection />
        <PlatformStatsStrip />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
