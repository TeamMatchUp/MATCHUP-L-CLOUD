import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Megaphone, CheckCircle } from "lucide-react";

const BUDGET_RANGES = [
  "Under £500",
  "£500 – £1,000",
  "£1,000 – £5,000",
  "£5,000+",
  "Not sure yet",
] as const;

export default function AdvertiseEnquiry() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [proposal, setProposal] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("ad_enquiries" as any).insert({
      contact_name: contactName.trim(),
      contact_email: contactEmail.trim(),
      contact_phone: contactPhone.trim() || null,
      company_name: companyName.trim(),
      company_website: companyWebsite.trim() || null,
      budget_range: budgetRange || null,
      proposal: proposal.trim(),
    } as any);

    setLoading(false);

    if (error) {
      toast({ title: "Failed to submit", description: error.message, variant: "destructive" });
      return;
    }

    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container max-w-2xl">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20"
              >
                <CheckCircle className="h-16 w-16 text-primary mx-auto mb-6" />
                <h1 className="font-heading text-4xl md:text-5xl text-foreground mb-3">
                  ENQUIRY <span className="text-primary">SENT</span>
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Thank you for your interest. Our team will review your enquiry and get back to you within 48 hours.
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Megaphone className="h-8 w-8 text-primary" />
                  <h1 className="font-heading text-4xl md:text-5xl text-foreground">
                    ADVERTISE WITH <span className="text-primary">MATCHUP</span>
                  </h1>
                </div>
                <p className="text-muted-foreground mb-8">
                  Reach thousands of fighters, coaches and event organisers. Fill in the form below and our team will be in touch.
                </p>

                <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-8 space-y-6">
                  {/* Contact Information */}
                  <div>
                    <h2 className="font-heading text-lg text-foreground mb-3">CONTACT INFORMATION</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <Input
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="John Smith"
                          required
                          maxLength={100}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address *</Label>
                        <Input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="john@company.com"
                          required
                          maxLength={255}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Phone Number</Label>
                        <Input
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="+44 7700 900000"
                          maxLength={30}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Company Information */}
                  <div>
                    <h2 className="font-heading text-lg text-foreground mb-3">COMPANY DETAILS</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Company / Brand Name *</Label>
                        <Input
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Acme Ltd"
                          required
                          maxLength={150}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Website</Label>
                        <Input
                          value={companyWebsite}
                          onChange={(e) => setCompanyWebsite(e.target.value)}
                          placeholder="https://company.com"
                          maxLength={255}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Budget Range</Label>
                        <Select value={budgetRange} onValueChange={setBudgetRange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a range" />
                          </SelectTrigger>
                          <SelectContent>
                            {BUDGET_RANGES.map((b) => (
                              <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Proposal */}
                  <div>
                    <h2 className="font-heading text-lg text-foreground mb-3">YOUR PROPOSAL</h2>
                    <div className="space-y-2">
                      <Label>Tell us about your advertising goals *</Label>
                      <Textarea
                        value={proposal}
                        onChange={(e) => setProposal(e.target.value)}
                        placeholder="Describe what you'd like to advertise, your target audience, preferred placement, and any other details..."
                        rows={5}
                        required
                        maxLength={2000}
                      />
                      <p className="text-xs text-muted-foreground text-right">{proposal.length}/2000</p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="hero"
                    className="w-full"
                    disabled={loading || !contactName.trim() || !contactEmail.trim() || !companyName.trim() || !proposal.trim()}
                  >
                    {loading ? "Submitting..." : "Submit Enquiry"}
                  </Button>
                </form>
              </motion.div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
