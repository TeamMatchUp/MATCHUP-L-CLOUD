import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

export default function Contact() {
  return (
    <div className="min-h-screen bg-background flex flex-col pt-16">
      <Header />
      <main className="flex-1 container py-12 px-8 md:px-12">
        <h1 className="font-heading text-4xl text-foreground mb-8">Contact Us</h1>
        
        <div className="text-muted-foreground space-y-6">
          <p className="leading-relaxed">
            Have a question, feedback, or need support? We're here to help. Reach out to the MatchUp team and we'll get back to you as soon as possible.
          </p>

          <div className="bg-accent/20 p-8 rounded-lg border border-border/50 w-full">
            <h2 className="text-xl font-medium text-foreground mb-4">Get in Touch</h2>
            <p className="mb-6">
              For general inquiries, support, or partnership opportunities, please email us at:
            </p>
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <a href="mailto:support@matchup.com">
                support@matchup.com
              </a>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
