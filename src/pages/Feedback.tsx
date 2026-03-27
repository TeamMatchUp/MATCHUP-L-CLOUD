import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Star, CheckCircle } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";

type PillOption = { label: string; value: string };

function PillSelector({ options, value, onChange }: { options: PillOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[44px] ${
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Star className={`h-7 w-7 transition-colors ${s <= value ? "text-primary fill-primary" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}

function NPSScale({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 overflow-x-auto">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={`min-h-[44px] min-w-[44px] rounded-lg text-sm font-medium transition-all ${
              value === i
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
            }`}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
        <span>Not likely</span>
        <span>Extremely likely</span>
      </div>
    </div>
  );
}

function QuestionBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

const FEATURE_OPTIONS = ["Matchmaking", "Fighter Profiles", "Gym Directory", "Events", "Analytics", "Actions"];

const FIGHTER_QS = [
  { key: "received_proposal", label: "Have you received a fight proposal through the platform?", options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }, { label: "Not yet", value: "not_yet" }] },
  { key: "analytics_useful", label: "How useful is your fighter analytics dashboard?", options: [{ label: "Not useful", value: "not_useful" }, { label: "Somewhat useful", value: "somewhat" }, { label: "Very useful", value: "very_useful" }] },
  { key: "found_gym_event", label: "Did you find a gym or event through Matchup?", options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }] },
];

const COACH_QS = [
  { key: "used_matchmaking", label: "Have you used the matchmaking tool to propose a fight for a roster fighter?", options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }] },
  { key: "lead_pipeline", label: "How well does the lead pipeline help you manage gym enquiries?", options: [{ label: "Not well", value: "not_well" }, { label: "Somewhat", value: "somewhat" }, { label: "Very well", value: "very_well" }] },
  { key: "saved_time", label: "Has Matchup saved you time compared to how you previously managed fighter bookings?", options: [{ label: "Yes", value: "yes" }, { label: "Somewhat", value: "somewhat" }, { label: "No", value: "no" }] },
];

const ORGANISER_QS = [
  { key: "used_suggestions", label: "Have you used Get Match Suggestions to build a fight card?", options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }] },
  { key: "suggestion_confidence", label: "How confident are you in the matchmaking suggestions quality?", options: [{ label: "Not confident", value: "not_confident" }, { label: "Somewhat", value: "somewhat" }, { label: "Very confident", value: "very_confident" }] },
  { key: "reduced_time", label: "Has the platform reduced the time it takes to fill your event card?", options: [{ label: "Yes", value: "yes" }, { label: "Somewhat", value: "somewhat" }, { label: "No", value: "no" }] },
];

export default function Feedback() {
  const { user, effectiveRoles } = useAuth();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recentDate, setRecentDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [overallRating, setOverallRating] = useState(0);
  const [nps, setNps] = useState<number | null>(null);
  const [roleAnswers, setRoleAnswers] = useState<Record<string, string>>({});
  const [featureMost, setFeatureMost] = useState("");
  const [frustrated, setFrustrated] = useState("");
  const [wantedFeature, setWantedFeature] = useState("");
  const [proInterest, setProInterest] = useState("");
  const [otherComments, setOtherComments] = useState("");

  const role = effectiveRoles.includes("organiser")
    ? "organiser"
    : effectiveRoles.includes("coach")
    ? "coach"
    : "fighter";

  const roleLabel = role === "organiser" ? "Organiser" : role === "coach" ? "Coach" : "Fighter";
  const roleQuestions = role === "fighter" ? FIGHTER_QS : role === "coach" ? COACH_QS : ORGANISER_QS;

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data } = await supabase
        .from("feedback")
        .select("submitted_at")
        .eq("user_id", user.id)
        .gte("submitted_at", thirtyDaysAgo.toISOString())
        .order("submitted_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const nextDate = new Date(data[0].submitted_at);
        nextDate.setDate(nextDate.getDate() + 30);
        setRecentDate(nextDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));
      }
      setLoading(false);
    };
    check();
  }, [user]);

  const handleSubmit = async () => {
    if (overallRating === 0) { toast.error("Please provide an overall rating"); return; }
    if (nps === null) { toast.error("Please provide an NPS score"); return; }
    setSubmitting(true);

    const answers: Record<string, any> = {
      overall_rating: overallRating,
      nps,
      ...roleAnswers,
      feature_most_used: featureMost,
      frustrated: frustrated || null,
      wanted_feature: wantedFeature || null,
      pro_interest: proInterest,
      other_comments: otherComments || null,
    };

    const { error } = await supabase.from("feedback").insert({
      user_id: user!.id,
      role,
      answers,
    });

    setSubmitting(false);
    if (error) { toast.error("Failed to submit feedback"); return; }
    setSubmitted(true);
  };

  if (!user) {
    navigate(`/auth?returnTo=${encodeURIComponent("/feedback")}`);
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col pt-16">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="h-8 w-48 bg-card animate-pulse rounded" />
        </main>
        <Footer />
      </div>
    );
  }

  if (recentDate) {
    return (
      <div className="min-h-screen bg-background flex flex-col pt-16">
        <Header />
        <main className="flex-1 flex items-center justify-center px-5">
          <div className="text-center max-w-md">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="font-heading text-2xl text-foreground mb-3">Already Submitted</h1>
            <p className="text-muted-foreground">You've already submitted feedback recently. You can submit again after {recentDate}.</p>
            <Button className="mt-6" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col pt-16">
        <Header />
        <main className="flex-1 flex items-center justify-center px-5">
          <div className="text-center max-w-md">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="font-heading text-2xl text-foreground mb-3">Thank You</h1>
            <p className="text-muted-foreground">Thank you for your feedback. It helps us build a better Matchup.</p>
            <Button className="mt-6" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pt-16">
      <Header />
      <main className="flex-1 py-12 md:py-16 px-5">
        <div className="mx-auto w-full" style={{ maxWidth: 680 }}>
          <div className="rounded-lg border border-border bg-card p-6 md:p-8 space-y-7">
            <div className="text-center mb-2">
              <AppLogo className="h-6 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Help us improve Matchup. This takes under 3 minutes.</p>
            </div>

            {/* Overall rating */}
            <QuestionBlock label="Overall rating of Matchup">
              <StarRating value={overallRating} onChange={setOverallRating} />
            </QuestionBlock>

            {/* NPS */}
            <QuestionBlock label="Likelihood to recommend Matchup to someone in combat sports">
              <NPSScale value={nps} onChange={setNps} />
            </QuestionBlock>

            {/* Divider + role section */}
            <div className="border-t border-border pt-6">
              <h3 className="font-heading text-lg text-foreground mb-5">
                Your Experience as a <span className="text-primary">{roleLabel}</span>
              </h3>
              <div className="space-y-7">
                {roleQuestions.map((q) => (
                  <QuestionBlock key={q.key} label={q.label}>
                    <PillSelector
                      options={q.options}
                      value={roleAnswers[q.key] || ""}
                      onChange={(v) => setRoleAnswers((prev) => ({ ...prev, [q.key]: v }))}
                    />
                  </QuestionBlock>
                ))}
              </div>
            </div>

            {/* Closing questions */}
            <div className="border-t border-border pt-6 space-y-7">
              <QuestionBlock label="Which feature do you use most?">
                <Select value={featureMost} onValueChange={setFeatureMost}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Select a feature" /></SelectTrigger>
                  <SelectContent>
                    {FEATURE_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </QuestionBlock>

              <QuestionBlock label="Is there anything on the platform that frustrated you or didn't work as expected?">
                <Textarea
                  value={frustrated}
                  onChange={(e) => setFrustrated(e.target.value)}
                  placeholder="Tell us what went wrong or could be better."
                  className="min-h-[80px]"
                />
              </QuestionBlock>

              <QuestionBlock label="What one feature would make the biggest difference to your experience?">
                <Textarea
                  value={wantedFeature}
                  onChange={(e) => setWantedFeature(e.target.value)}
                  placeholder="Your most wanted improvement."
                  className="min-h-[80px]"
                />
              </QuestionBlock>

              <QuestionBlock label="Would you be interested in a Pro or Featured tier with additional tools when available?">
                <PillSelector
                  options={[{ label: "Yes", value: "yes" }, { label: "Maybe", value: "maybe" }, { label: "No", value: "no" }]}
                  value={proInterest}
                  onChange={setProInterest}
                />
              </QuestionBlock>

              <QuestionBlock label="Any other comments?">
                <Textarea
                  value={otherComments}
                  onChange={(e) => setOtherComments(e.target.value)}
                  placeholder="Optional"
                  className="min-h-[80px]"
                />
              </QuestionBlock>
            </div>

            <div className="flex justify-center pt-2">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full md:w-auto md:max-w-[320px] min-h-[44px] text-base"
              >
                {submitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}