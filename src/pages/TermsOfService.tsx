import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background flex flex-col pt-16">
      <Header />
      <main className="flex-1 container max-w-4xl py-12 px-4">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <div className="space-y-8 text-muted-foreground">
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Acceptance of Terms</h2>
            <p>By creating an account or using the platform, users agree to the Terms of Service. Users must be at least 18 years old to use the platform.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Platform Description</h2>
            <p>MatchUp is a digital platform that allows fighters, coaches, and event organisers to connect, manage fighter profiles, and coordinate fights.</p>
            <p className="mt-2 font-medium text-foreground">MatchUp is NOT a fight promoter, sanctioning body, or regulatory authority.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">User Roles</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Fighters:</strong> Create fighter profiles.</li>
              <li><strong>Coaches:</strong> Manage gyms and fighter records.</li>
              <li><strong>Event Organisers:</strong> Create events and propose fights.</li>
            </ul>
            <p className="mt-4">Users are responsible for ensuring information they submit is accurate.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Account Responsibilities</h2>
            <p>Users must maintain accurate information and protect their login credentials. MatchUp may suspend or terminate accounts that violate the platform rules.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Fighter Records Disclaimer</h2>
            <p>Fighter records may be submitted by coaches or generated from events. MatchUp does not guarantee the historical accuracy of all records.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Event Listings Disclaimer</h2>
            <p>MatchUp facilitates connections between users but does not organise fights or control contractual agreements between fighters and promoters.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">User Generated Content</h2>
            <p>Users may upload fighter profiles, gym information, event listings, and images. By submitting content, users grant MatchUp a non-exclusive license to display that content on the platform.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Prohibited Activities</h2>
            <p>We prohibit fraudulent records, impersonation, harassment, scraping, and any illegal activities on the platform.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Platform Availability</h2>
            <p>The platform may experience downtime or updates from time to time.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Limitation of Liability</h2>
            <p>MatchUp is not responsible for injuries, financial losses, or disputes resulting from events or fights.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Account Termination</h2>
            <p>MatchUp may suspend or terminate accounts for violations of the terms.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Governing Law</h2>
            <p>These terms are governed by the laws of the United Kingdom.</p>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
