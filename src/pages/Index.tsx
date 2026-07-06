import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { UpcomingFightsTicker } from "@/components/landing/UpcomingFightsTicker";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { TopFightersSeekingSection } from "@/components/landing/TopFightersSeekingSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PlatformStatsStrip } from "@/components/landing/PlatformStatsStrip";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { SEO } from "@/components/SEO";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="MatchUp — Combat Sports Matchmaking"
        description="The UK matchmaking platform for MMA and Muay Thai. Discover events, explore fighters, and confirm your next bout."
        canonicalPath="/"
        jsonLd={[
          { "@context": "https://schema.org", "@type": "Organization", name: "MatchUp", url: "https://matchupfight.lovable.app" },
          { "@context": "https://schema.org", "@type": "WebSite", name: "MatchUp", url: "https://matchupfight.lovable.app" },
        ]}
      />
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
