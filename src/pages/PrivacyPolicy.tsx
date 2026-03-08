import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container max-w-4xl py-12 px-4">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="mb-8 text-muted-foreground">This policy explains how user data is collected and used on MatchUp.</p>
        
        <div className="space-y-8 text-muted-foreground">
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Information Collected</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account data:</strong> Name and email address.</li>
              <li><strong>Profile data:</strong> Fighter records, gym affiliations, and event participation.</li>
              <li><strong>Technical data:</strong> Device information and IP address.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">How Data Is Used</h2>
            <p>Data is used to operate the platform, enable matchmaking features, improve services, and maintain security.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Public Profile Information</h2>
            <p>Fighter profiles, records, gyms, and events may be publicly visible to other users and visitors of the platform.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Data Sharing</h2>
            <p>Data may be shared with other users of the platform or service providers to facilitate connections, but is not sold to third parties.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Cookies and Analytics</h2>
            <p>Cookies may be used for managing login sessions and gathering analytics to improve user experience.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Data Retention</h2>
            <p>Account data is stored while accounts are active and for a reasonable period afterward as required by law or for operational purposes.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">User Rights</h2>
            <p>Users may request access to, correction of, or deletion of their personal data by contacting support.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Security</h2>
            <p>Reasonable security measures are used to protect data and prevent unauthorized access or disclosure.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Children’s Privacy</h2>
            <p>Users must be at least 18 years old to create an account. We do not knowingly collect information from children.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Policy Updates</h2>
            <p>These policies may be updated periodically. We will notify users of significant changes where appropriate.</p>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
