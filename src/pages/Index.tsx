import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { UpcomingFightsTicker } from "@/components/landing/UpcomingFightsTicker";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { TopFightersSeekingSection } from "@/components/landing/TopFightersSeekingSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PlatformStatsStrip } from "@/components/landing/PlatformStatsStrip";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <HeroSection />
        <UpcomingFightsTicker />
        <FeatureShowcase />
        <TopFightersSeekingSection />
        <PlatformStatsStrip />
        <HowItWorksSection />
        <FinalCtaSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
