import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col pt-16">
      <Header />
      <main className="flex-1 container max-w-4xl py-12 px-4">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="mb-8 text-muted-foreground">Last updated: March 2026. This policy explains how user data is collected, used, and protected on MatchUp.</p>
        
        <div className="space-y-8 text-muted-foreground">
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Information Collected</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account data:</strong> Full name, email address, and password hash (encrypted).</li>
              <li><strong>Profile data:</strong> Fighter profiles including weight class, discipline, stance, fighting style, height, reach, walk-around weight, date of birth, amateur and professional fight records, bio, and region.</li>
              <li><strong>Gym data:</strong> Gym name, address, postcode, contact details, discipline tags, training schedule, social media links, and logo.</li>
              <li><strong>Event data:</strong> Event titles, dates, venues, descriptions, ticket information, and fight card details.</li>
              <li><strong>Interaction data:</strong> Match proposals, fight confirmations, gym join requests, trial session requests, event interest registrations, and notification preferences.</li>
              <li><strong>Location data:</strong> Postcodes used for distance-based filtering (gyms near you, events near you). We do not track real-time GPS location.</li>
              <li><strong>Technical data:</strong> Device information, browser type, IP address, and session cookies for authentication.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">How Data Is Used</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Platform operation:</strong> To create and manage user accounts, fighter profiles, gym listings, and event pages.</li>
              <li><strong>Matchmaking:</strong> To generate match suggestions between fighters based on weight class, record, style, and other attributes.</li>
              <li><strong>Discovery:</strong> To enable distance-based search for gyms and events using postcode data.</li>
              <li><strong>Communications:</strong> To send in-platform notifications about match proposals, gym requests, event updates, and system messages.</li>
              <li><strong>Analytics:</strong> To provide coaches, fighters, and organisers with performance insights and platform statistics.</li>
              <li><strong>Service improvement:</strong> To improve platform features, fix bugs, and enhance user experience based on aggregated usage patterns.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Matchmaking Algorithm & AI</h2>
            <p className="mb-3">
              MatchUp's matchmaking feature uses an <strong>algorithmic scoring engine</strong>, not a live AI API call per match. The engine evaluates fighter pairs across four dimensions — competitiveness, entertainment value, style contrast, and narrative appeal — using pre-defined scoring rules and lookup tables.
            </p>
            <p className="mb-3">
              No personal data is sent to external AI services during the matchmaking process. All scoring calculations happen within the platform using data you have explicitly provided in your fighter profile.
            </p>
            <p>
              The algorithm is updated regularly based on real-world feedback from coaches, organisers, and fight outcomes to improve match quality and safety standards. These updates refine scoring weights and safety gates but do not change what data is collected.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Public Profile Information</h2>
            <p>Fighter profiles, records, gyms, and events may be publicly visible to other users and visitors of the platform. You can control your profile visibility in your account settings.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Data Sharing</h2>
            <p>Data may be shared with other users of the platform (e.g., coaches can see fighter profiles, organisers can see match suggestions) to facilitate connections. Your data is <strong>never sold to third parties</strong>. We may share anonymised, aggregated data for research or platform improvement purposes.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Cookies and Analytics</h2>
            <p>We use essential cookies to manage login sessions and authentication. We may use analytics tools to understand how the platform is used and to improve the user experience. No advertising cookies or third-party tracking cookies are used.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Data Retention</h2>
            <p>Account data is stored while accounts are active. Fight records and results are retained indefinitely as part of the platform's verified record system. You may request deletion of your account and personal data at any time — fight results may be anonymised rather than deleted to preserve the integrity of opponent records.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">User Rights</h2>
            <p>Under applicable data protection laws, you have the right to access, correct, or delete your personal data. You may also request a copy of your data in a portable format. To exercise these rights, contact us at the address below.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Security</h2>
            <p>We use industry-standard security measures including encrypted connections (TLS), secure password hashing, and row-level security policies on all database tables to ensure your data is accessible only to authorised parties.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Children's Privacy</h2>
            <p>Users must be at least 18 years old to create an account. We do not knowingly collect information from children under 18.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Policy Updates</h2>
            <p>This policy may be updated periodically. We will notify users of significant changes via in-platform notifications. Continued use of the platform after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Contact & Feedback</h2>
            <p>
              For privacy-related enquiries, data requests, or to provide feedback on our matchmaking algorithm, please contact us via the{" "}
              <a href="/contact" className="text-primary hover:underline">Contact page</a>.
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
