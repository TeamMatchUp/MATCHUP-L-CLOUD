import "@/components/landing-v2/styles.css";
import { LandingHeader } from "@/components/landing-v2/LandingHeader";
import { HeroSection } from "@/components/landing-v2/HeroSection";
import { ProblemSection } from "@/components/landing-v2/ProblemSection";
import { WhoItsForSection } from "@/components/landing-v2/WhoItsForSection";
import { HowItWorksSection } from "@/components/landing-v2/HowItWorksSection";
import { CtaBand } from "@/components/landing-v2/CtaBand";
import { LandingFooter } from "@/components/landing-v2/LandingFooter";

const Index = () => {
  return (
    <div className="lv2">
      <LandingHeader />
      <main>
        <HeroSection />
        <ProblemSection />
        <WhoItsForSection />
        <HowItWorksSection />
        <CtaBand />
      </main>
      <LandingFooter />
    </div>
  );
};

export default Index;
