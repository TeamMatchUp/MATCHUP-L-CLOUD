import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface DeleteFighterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fighter: { id: string; name: string };
  gymId?: string;
  /** If true, removes fighter from gym only. If false, deletes the profile entirely. */
  removeFromGymOnly?: boolean;
  onSuccess: () => void;
}

export function DeleteFighterDialog({
  open, onOpenChange, fighter, gymId, removeFromGymOnly = false, onSuccess,
}: DeleteFighterDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setLoading(true);

    if (removeFromGymOnly && gymId) {
      const { error } = await supabase
        .from("fighter_gym_links")
        .delete()
        .eq("fighter_id", fighter.id)
        .eq("gym_id", gymId);

      if (error) {
        toast({ title: "Failed to remove fighter", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      toast({ title: "Fighter removed", description: `${fighter.name} has been removed from the gym.` });
    } else {
      // Delete gym links first, then the profile
      await supabase.from("fighter_gym_links").delete().eq("fighter_id", fighter.id);

      const { error } = await supabase
        .from("fighter_profiles")
        .delete()
        .eq("id", fighter.id);

      if (error) {
        toast({ title: "Failed to delete fighter", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      toast({ title: "Fighter deleted", description: `${fighter.name}'s profile has been permanently deleted.` });
    }

    setLoading(false);
    onSuccess();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading">
            {removeFromGymOnly ? "Remove Fighter from Gym?" : "Delete Fighter Profile?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {removeFromGymOnly
              ? `This will remove ${fighter.name} from this gym. Their profile will remain on the platform.`
              : `This will permanently delete ${fighter.name}'s profile, fight records, and all gym affiliations. This cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Processing..." : removeFromGymOnly ? "Remove" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
