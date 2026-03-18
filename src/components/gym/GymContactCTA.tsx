import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Send, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface GymContactCTAProps {
  gymId: string;
  gymName: string;
  coachId: string | null;
}

export function GymContactCTA({ gymId, gymName, coachId }: GymContactCTAProps) {
  const { user, effectiveRoles } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isFighter = effectiveRoles.includes("fighter");

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

  if (submitted) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
        <Check className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm text-foreground">Thank you! Your request has been submitted.</p>
      </div>
    );
  }

  // Authenticated fighter → Request Trial Session
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

      // Notify coach with fighter profile link
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

  // Non-authenticated → Register Interest form
  if (!showForm) {
    return (
      <Button variant="hero" className="gap-2" onClick={() => setShowForm(true)}>
        <Send className="h-4 w-4" />
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
    <form onSubmit={handleInterest} className="rounded-lg border border-border bg-card p-4 space-y-3">
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
