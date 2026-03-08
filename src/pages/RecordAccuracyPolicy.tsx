import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FightRecordBadge } from "@/components/fighter/FightRecordBadge";

export default function RecordAccuracyPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col pt-16">
      <Header />
      <main className="flex-1 container max-w-4xl py-12 px-4">
        <h1 className="text-4xl font-bold mb-8">Record Accuracy Policy</h1>
        
        <div className="space-y-8 text-muted-foreground">
          
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Managing Fighter Records</h2>
            <p className="mb-4">At MatchUp, maintaining the integrity and accuracy of fight records is a top priority.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fighters cannot add their own fight records.</li>
              <li>Fight records can only be created by Coaches or generated from event results on the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Verification Types</h2>
            <p className="mb-4">Two verification types exist to help users understand the source of a fight record:</p>
            
            <div className="space-y-6 mt-6">
              <div className="flex gap-4 items-start bg-accent/20 p-6 rounded-lg border border-border/50">
                <div className="pt-1">
                  <FightRecordBadge verificationStatus="coach_verified" size="md" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Coach Verified</h3>
                  <p>Coach Verified records are added manually by a coach associated with the fighter’s gym. These reflect historical bouts or fights occurring outside the MatchUp platform.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start bg-accent/20 p-6 rounded-lg border border-border/50">
                <div className="pt-1">
                  <FightRecordBadge verificationStatus="event_verified" size="md" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Event Verified</h3>
                  <p>Event Verified records are generated automatically when a fight result is recorded at an official MatchUp event and confirmed by both coaches. These provide the highest level of trust and transparency.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Transparency</h2>
            <p>Verification indicators are displayed prominently on fighter profiles so users can instantly understand how records were created and verified.</p>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
}
