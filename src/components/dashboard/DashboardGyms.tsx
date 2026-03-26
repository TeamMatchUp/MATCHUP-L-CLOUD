import { useState, useEffect } from "react";
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
import { Plus, Pencil, ArrowUp, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { GymInvitesPanel } from "@/components/fighter/GymInvitesPanel";
import { MyGymsPanel } from "@/components/fighter/MyGymsPanel";
import { GymTierBadge } from "@/components/gym/GymTierBadge";
import { GymAnalyticsStrip } from "@/components/gym/GymAnalyticsStrip";
import { UpgradeGymDialog } from "@/components/gym/UpgradeGymDialog";
import { EditGymDialog } from "@/components/gym/EditGymDialog";
import { ImportFightersDialog } from "@/components/coach/ImportFightersDialog";

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
  const [upgradeGym, setUpgradeGym] = useState<any>(null);
  const [editGym, setEditGym] = useState<any>(null);
  const [importGym, setImportGym] = useState<any>(null);
  const [newGymName, setNewGymName] = useState("");
  const [newGymLocation, setNewGymLocation] = useState("");
  const [newGymCountry, setNewGymCountry] = useState<CountryCode>("UK");
  const [newGymDescription, setNewGymDescription] = useState("");

  // (1) Belt-and-braces: fix unclaimed gyms on mount
  useEffect(() => {
    if (!isCoachOrOwner || myGyms.length === 0) return;
    myGyms.forEach(async (gym) => {
      if (gym.coach_id === userId && gym.claimed === false) {
        await supabase.from("gyms").update({ claimed: true, listing_tier: gym.listing_tier === "unclaimed" ? "free" : gym.listing_tier }).eq("id", gym.id);
        onRefresh();
      }
    });
  }, [myGyms, userId, isCoachOrOwner]);

  const createGymMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("gyms").insert({
        name: newGymName,
        location: newGymLocation || null,
        country: newGymCountry,
        description: newGymDescription || null,
        coach_id: userId,
        claimed: true,
        listing_tier: "free",
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
        <GymInvitesPanel fighterProfileId={fighterProfileId} />
        <MyGymsPanel fighterProfileId={fighterProfileId} />
      </div>
    );
  }

  // Coach / Gym Owner view
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
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
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-heading text-lg text-foreground">{gym.name}</h3>
                  {/* (8) Tier badge on gym cards */}
                  <GymTierBadge tier={gym.listing_tier} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {gym.location} · {gym.country}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {gym.fighter_gym_links?.length ?? 0} fighters
                </p>
              </Link>
              {/* Analytics Strip */}
              <GymAnalyticsStrip gymId={gym.id} listingTier={gym.listing_tier} />
              <div className="flex gap-2 mt-3 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 flex-1"
                  onClick={() => onAddFighter(gym.id)}
                >
                  <Plus className="h-3 w-3" /> Add Fighter
                </Button>
                {/* (4) CSV upload button */}
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setImportGym(gym)}>
                  <Upload className="h-3 w-3" /> CSV
                </Button>
                {(gym.listing_tier === "free" || gym.listing_tier === "unclaimed") && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setUpgradeGym(gym)}>
                    <ArrowUp className="h-3 w-3" /> Upgrade
                  </Button>
                )}
                {/* (3) Edit button opens modal inline */}
                <Button size="sm" variant="ghost" className="gap-1" onClick={() => setEditGym(gym)}>
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {upgradeGym && (
        <UpgradeGymDialog
          open={!!upgradeGym}
          onOpenChange={(open) => { if (!open) setUpgradeGym(null); }}
          gymId={upgradeGym.id}
          gymName={upgradeGym.name}
        />
      )}
      {/* (3) Edit gym modal inline */}
      {editGym && (
        <EditGymDialog
          open={!!editGym}
          onOpenChange={(open) => { if (!open) setEditGym(null); }}
          gym={editGym}
          onSuccess={onRefresh}
          onDelete={onRefresh}
        />
      )}
      {/* (4) Import fighters CSV dialog */}
      {importGym && (
        <ImportFightersDialog
          open={!!importGym}
          onOpenChange={(open) => { if (!open) setImportGym(null); }}
          coachId={userId}
          gymId={importGym.id}
          gymName={importGym.name}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}
