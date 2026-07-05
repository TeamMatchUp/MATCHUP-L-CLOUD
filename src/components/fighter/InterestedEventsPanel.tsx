import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EventCard } from "@/components/explore/EventCard";

interface Props {
  fighterProfileId: string;
}

export function InterestedEventsPanel({ fighterProfileId }: Props) {
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data: interests = [], isLoading } = useQuery({
    queryKey: ["fighter-event-interests", fighterProfileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fighter_event_interests")
        .select(
          "id, event_id, created_at, events(*, tickets(*), event_boosts(expires_at, payment_status, created_at))"
        )
        .eq("fighter_id", fighterProfileId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleRemove = async () => {
    if (!removingId) return;
    const { error } = await supabase
      .from("fighter_event_interests")
      .delete()
      .eq("id", removingId);

    if (error) {
      toast.error("Failed to remove interest.");
    } else {
      toast.success("Interest removed.");
      queryClient.invalidateQueries({ queryKey: ["fighter-event-interests"] });
    }
    setRemovingId(null);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[232px] bg-card animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (interests.length === 0) {
    return (
      <div className="rounded-xl bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
        <p className="text-muted-foreground mb-2">You haven't expressed interest in any events yet.</p>
        <Button variant="ghost" asChild>
          <Link to="/explore?tab=events">Browse Events</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {interests.map((interest: any, i: number) => {
          const event = interest.events;
          if (!event) return null;
          return (
            <div key={interest.id} className="relative group">
              <EventCard event={event} index={i} />
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRemovingId(interest.id); }}
                className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "rgba(0,0,0,0.65)",
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "hsl(var(--destructive))",
                }}
                title="Remove interest"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!removingId} onOpenChange={(open) => !open && setRemovingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Interest</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your interest in this event?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
