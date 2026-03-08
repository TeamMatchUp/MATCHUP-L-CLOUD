import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { ThreeSidesSection } from "@/components/landing/ThreeSidesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TwoSidedSection } from "@/components/landing/TwoSidedSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <HeroSection />
        <TwoSidedSection />
        <ThreeSidesSection />
        <HowItWorksSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
