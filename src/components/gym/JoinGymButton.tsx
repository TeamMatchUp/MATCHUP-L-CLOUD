import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Check, Clock } from "lucide-react";

interface Props {
  gymId: string;
}

export function JoinGymButton({ gymId }: Props) {
  const { user, effectiveRoles } = useAuth();
  const { toast } = useToast();

  const isFighter = effectiveRoles.includes("fighter");
  if (!user || !isFighter) return null;

  // Check if fighter profile exists
  const { data: fighterProfile } = useQuery({
    queryKey: ["fighter-profile", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fighter_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });

  // Check existing link
  const { data: existingLink, refetch } = useQuery({
    queryKey: ["gym-link", gymId, fighterProfile?.id],
    queryFn: async () => {
      if (!fighterProfile) return null;
      const { data } = await supabase
        .from("fighter_gym_links")
        .select("id, status")
        .eq("gym_id", gymId)
        .eq("fighter_id", fighterProfile.id)
        .maybeSingle();
      return data;
    },
    enabled: !!fighterProfile,
  });

  const requestJoin = useMutation({
    mutationFn: async () => {
      if (!fighterProfile) throw new Error("Create a fighter profile first");
      const { error } = await supabase.from("fighter_gym_links").insert({
        gym_id: gymId,
        fighter_id: fighterProfile.id,
        status: "pending",
        is_primary: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Request sent", description: "Waiting for coach approval." });
      refetch();
    },
    onError: (e: any) => {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    },
  });

  if (!fighterProfile) return null;

  if (existingLink) {
    if (existingLink.status === "pending") {
      return (
        <Button variant="outline" disabled className="gap-2">
          <Clock className="h-4 w-4" /> Request Pending
        </Button>
      );
    }
    return (
      <Button variant="outline" disabled className="gap-2">
        <Check className="h-4 w-4" /> Member
      </Button>
    );
  }

  return (
    <Button
      variant="hero"
      className="gap-2"
      onClick={() => requestJoin.mutate()}
      disabled={requestJoin.isPending}
    >
      <UserPlus className="h-4 w-4" />
      {requestJoin.isPending ? "Requesting..." : "Request to Join"}
    </Button>
  );
}
