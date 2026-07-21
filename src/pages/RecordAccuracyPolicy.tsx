import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function RecordAccuracyPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col pt-16">
      <Header />
      <main className="flex-1 container max-w-4xl py-12 px-4">
        <h1 className="text-4xl font-bold mb-8">Record Accuracy Policy</h1>

        <div className="space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Managing Fighter Records</h2>
            <p className="mb-4">
              At MatchUp, maintaining the integrity and accuracy of fight records is a top priority.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fighters cannot add their own fight records.</li>
              <li>Historical fights are entered by a fighter's coach.</li>
              <li>Fights that take place on the MatchUp platform are generated automatically from the event card and confirmed by both fighters.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">How your MU Score is calculated</h2>
            <p className="mb-4">
              Your MU Score is a conservative estimate of your skill level. It rises as you win — and
              as you prove your record in Matchup-confirmed fights. Both platform-confirmed results
              and historical fights feed into it, using different assumptions:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <strong>Matchup-confirmed fights</strong> — bouts that took place on a Matchup event
                card and were confirmed by both fighters. Your score moves precisely against your
                opponent's real rating at the time of the fight.
              </li>
              <li>
                <strong>Historical fights</strong> — self-reported or coach-entered results from
                before or outside the platform. These still affect your MU Score, but against a
                neutral assumption about opponent strength, since we can't verify an opponent's real
                rating at a past point in time. Fighter-entered and coach-entered historical records
                are treated the same.
              </li>
            </ul>
            <p className="mb-4">
              We can't invent opponents you haven't fought. Only results tied to a Matchup event are
              treated as event-confirmed; everything else is historical, whoever entered it.
            </p>
            <p>
              Amateur results count for roughly half the movement of a pro result, and finishes
              (KO / TKO / Submission) carry a small extra swing. Your score is shown conservatively
              — a fighter with very few results will sit near the middle of the range until enough
              fights accumulate to sharpen the estimate.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Transparency</h2>
            <p>
              MU Score is shown on every fighter profile so users can see how a fighter is rated by the
              platform. If you spot an inaccurate record, contact us and we'll investigate.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
