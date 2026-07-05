import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Mail, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface GymContactCTAProps {
  gymId: string;
  gymName: string;
  coachId: string | null;
  contactEmail?: string | null;
}

/**
 * Contact-gym primary action.
 * - Fighters see a Request Trial Session button (logs a lead + notifies coach).
 * - Everyone else gets a mailto: link with subject + body pre-filled from
 *   their profile / active organiser context so the gym knows who's writing.
 * - Falls back to a lightweight "Register Interest" form when no email is on file.
 */
export function GymContactCTA({ gymId, gymName, coachId, contactEmail }: GymContactCTAProps) {
  const { user, effectiveRoles } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isFighter = effectiveRoles.includes("fighter");
  const isOrganiser = effectiveRoles.includes("organiser");

  const { data: fighterProfile } = useQuery({
    queryKey: ["fighter-profile-cta", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_profiles")
        .select("id, name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && isFighter,
  });

  // If the sender is an organiser, prefill mailto with their nearest upcoming event.
  const { data: senderEvent } = useQuery({
    queryKey: ["organiser-next-event", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("events")
        .select("id, title, date")
        .eq("organiser_id", user!.id)
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user && isOrganiser,
  });

  const { data: senderProfile } = useQuery({
    queryKey: ["profile-full-name", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  if (submitted) {
    return (
      <div className="rounded-lg bg-primary/10 p-4 flex items-center gap-3">
        <Check className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm text-foreground">Thank you! Your request has been submitted.</p>
      </div>
    );
  }

  // Fighter → Request Trial Session (unchanged behaviour)
  if (user && isFighter && fighterProfile) {
    const handleTrialRequest = async () => {
      setLoading(true);
      const { error } = await supabase.from("gym_leads" as any).insert({
        gym_id: gymId,
        name: fighterProfile.name,
        email: user.email ?? "",
        user_id: user.id,
        type: "trial_request",
      } as any);

      if (error) {
        toast({ title: "Failed to submit request", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (coachId) {
        await supabase.rpc("create_notification", {
          _user_id: coachId,
          _title: "Trial session request",
          _message: `${fighterProfile.name} has requested a trial session at ${gymName}. View their profile: /fighters/${fighterProfile.id}`,
          _type: "gym_request" as const,
          _reference_id: fighterProfile.id,
        });
      }

      setSubmitted(true);
      setLoading(false);
    };

    return (
      <Button variant="hero" className="gap-2" onClick={handleTrialRequest} disabled={loading}>
        <UserPlus className="h-4 w-4" />
        {loading ? "Sending..." : "Request Trial Session"}
      </Button>
    );
  }

  // Everyone else → mailto with prefilled context (organiser event, or generic).
  if (contactEmail) {
    const senderName = senderProfile?.full_name ?? user?.email?.split("@")[0] ?? "";
    const senderEmailLine = user?.email ? `\n\nContact: ${user.email}` : "";
    const subject = isOrganiser && senderEvent
      ? `Enquiry via MatchUp — ${gymName} × ${senderEvent.title}`
      : `Enquiry via MatchUp — ${gymName}`;
    const body = isOrganiser && senderEvent
      ? `Hi ${gymName},\n\nI'm ${senderName || "an event organiser"} reaching out via MatchUp regarding my event "${senderEvent.title}" on ${new Date(senderEvent.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.\n\nI'd like to discuss opportunities for your fighters on the card.${senderEmailLine}\n\nThanks,\n${senderName}`
      : `Hi ${gymName},\n\n${senderName ? `I'm ${senderName} and ` : ""}I'd like to enquire about training at your gym via MatchUp.${senderEmailLine}\n\nThanks${senderName ? `,\n${senderName}` : ""}`;

    const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    return (
      <a
        href={mailto}
        className="inline-flex items-center gap-2 rounded-lg font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 px-5 h-11"
      >
        <Mail className="h-4 w-4" />
        Contact Gym
      </a>
    );
  }

  // Fallback (no contact email on file) — keep register interest form
  if (!showForm) {
    return (
      <Button variant="hero" className="gap-2" onClick={() => setShowForm(true)}>
        <Mail className="h-4 w-4" />
        Register Interest
      </Button>
    );
  }

  const handleInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("gym_leads" as any).insert({
      gym_id: gymId,
      name,
      email,
      user_id: user?.id ?? null,
      type: "interest",
    } as any);
    if (error) {
      toast({ title: "Failed to submit", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <form onSubmit={handleInterest} className="rounded-lg bg-card p-4 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
      <p className="text-sm font-medium text-foreground">Register your interest</p>
      <div className="space-y-1">
        <Label className="text-xs">Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
        <Button type="submit" size="sm" disabled={loading || !name || !email}>
          {loading ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </form>
  );
}
