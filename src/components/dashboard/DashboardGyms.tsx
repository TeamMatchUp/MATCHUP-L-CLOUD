import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { GymInvitesPanel } from "@/components/fighter/GymInvitesPanel";
import { MyGymsPanel } from "@/components/fighter/MyGymsPanel";

type CountryCode = Database["public"]["Enums"]["country_code"];
const COUNTRIES = Constants.public.Enums.country_code;

interface DashboardGymsProps {
  isCoachOrOwner: boolean;
  isFighter: boolean;
  fighterProfileId?: string;
  myGyms: any[];
  userId: string;
  onAddFighter: (gymId: string) => void;
  onRefresh: () => void;
}

export function DashboardGyms({
  isCoachOrOwner,
  isFighter,
  fighterProfileId,
  myGyms,
  userId,
  onAddFighter,
  onRefresh,
}: DashboardGymsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateGym, setShowCreateGym] = useState(false);
  const [newGymName, setNewGymName] = useState("");
  const [newGymLocation, setNewGymLocation] = useState("");
  const [newGymCountry, setNewGymCountry] = useState<CountryCode>("UK");
  const [newGymDescription, setNewGymDescription] = useState("");

  const createGymMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("gyms").insert({
        name: newGymName,
        location: newGymLocation || null,
        country: newGymCountry,
        description: newGymDescription || null,
        coach_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Gym created" });
      setShowCreateGym(false);
      setNewGymName("");
      setNewGymLocation("");
      setNewGymDescription("");
      onRefresh();
    },
    onError: (e: any) => {
      toast({ title: "Failed to create gym", description: e.message, variant: "destructive" });
    },
  });

  // Fighter view
  if (isFighter && !isCoachOrOwner && fighterProfileId) {
    return (
      <div className="space-y-6">
        <h2 className="font-heading text-2xl text-foreground">
          MY <span className="text-primary">GYMS</span>
        </h2>
        <GymInvitesPanel fighterProfileId={fighterProfileId} />
        <MyGymsPanel fighterProfileId={fighterProfileId} />
      </div>
    );
  }

  // Coach / Gym Owner view
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-2xl text-foreground">
          MY <span className="text-primary">GYMS</span>
        </h2>
        <Button
          size="sm"
          className="gap-1"
          onClick={() => setShowCreateGym(!showCreateGym)}
        >
          <Plus className="h-3 w-3" /> Create Gym
        </Button>
      </div>

      {showCreateGym && (
        <div className="rounded-lg border border-border bg-card p-6 mb-6">
          <h3 className="font-heading text-lg text-foreground mb-4">NEW GYM</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <Label>Gym Name</Label>
              <Input
                value={newGymName}
                onChange={(e) => setNewGymName(e.target.value)}
                placeholder="e.g. Tiger Muay Thai"
              />
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input
                value={newGymLocation}
                onChange={(e) => setNewGymLocation(e.target.value)}
                placeholder="e.g. London, UK"
              />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Select value={newGymCountry} onValueChange={(v) => setNewGymCountry(v as CountryCode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1 mb-4">
            <Label>Description</Label>
            <Textarea
              value={newGymDescription}
              onChange={(e) => setNewGymDescription(e.target.value)}
              placeholder="About your gym..."
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => createGymMutation.mutate()}
              disabled={!newGymName || createGymMutation.isPending}
            >
              {createGymMutation.isPending ? "Creating..." : "Create Gym"}
            </Button>
            <Button variant="ghost" onClick={() => setShowCreateGym(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {myGyms.length === 0 && !showCreateGym ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground mb-4">You haven't created any gyms yet.</p>
          <Button onClick={() => setShowCreateGym(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Create Your First Gym
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myGyms.map((gym) => (
            <div
              key={gym.id}
              className="rounded-lg border border-border bg-card p-5 hover:border-primary/30 transition-colors"
            >
              <Link to={`/gyms/${gym.id}`}>
                <h3 className="font-heading text-lg text-foreground">{gym.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {gym.location} · {gym.country}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {gym.fighter_gym_links?.length ?? 0} fighters
                </p>
              </Link>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 flex-1"
                  onClick={() => onAddFighter(gym.id)}
                >
                  <Plus className="h-3 w-3" /> Add Fighter
                </Button>
                <Button size="sm" variant="ghost" className="gap-1" asChild>
                  <Link to={`/gyms/${gym.id}`}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
