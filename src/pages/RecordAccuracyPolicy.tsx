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
              Every fight you log affects your MU Score. Fights confirmed through a MatchUp event use your
              opponent's verified rating to calculate the result precisely, since both fighters' scores are
              being measured live and simultaneously.
            </p>
            <p className="mb-4">
              Self-reported historical fights also move your MU Score, but they use a neutral assumption
              about opponent strength — we can't verify an opponent's real rating at a past point in time.
              The amateur / pro weighting in our Elo engine still applies, so your score still moves; the
              platform just treats these results more conservatively until you compete through MatchUp.
            </p>
            <p>
              In short: platform-confirmed results move your score precisely against a known opponent;
              historical results still count, but against a neutral assumption of opponent strength.
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
