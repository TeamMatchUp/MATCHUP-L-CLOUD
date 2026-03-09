import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Trash2 } from "lucide-react";
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
        .select("id, event_id, created_at, events(id, title, date, location, promotion_name, status)")
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
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 bg-card animate-pulse rounded-lg border border-border" />
        ))}
      </div>
    );
  }

  if (interests.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground mb-2">You haven't expressed interest in any events yet.</p>
        <Button variant="ghost" asChild>
          <Link to="/events">Browse Events</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {interests.map((interest: any) => {
          const event = interest.events;
          if (!event) return null;
          return (
            <div
              key={interest.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors"
            >
              <Link to={`/events/${event.id}`} className="flex-1 min-w-0">
                <h3 className="font-heading text-lg text-foreground truncate">{event.title}</h3>
                {event.promotion_name && (
                  <p className="text-xs text-muted-foreground">{event.promotion_name}</p>
                )}
                <div className="flex flex-wrap gap-4 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(event.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </span>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive shrink-0 ml-2"
                onClick={() => setRemovingId(interest.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
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
