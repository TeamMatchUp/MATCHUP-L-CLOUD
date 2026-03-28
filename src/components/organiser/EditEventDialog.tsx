import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Globe, EyeOff, MapPin } from "lucide-react";
import { geocodePostcode } from "@/hooks/use-postcode-search";

type CountryCode = Database["public"]["Enums"]["country_code"];
type EventStatus = Database["public"]["Enums"]["event_status"];
type EventRow = Database["public"]["Tables"]["events"]["Row"];
const COUNTRIES = Constants.public.Enums.country_code;

interface EditEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventRow;
  onSuccess: () => void;
  onDelete?: () => void;
}

export function EditEventDialog({ open, onOpenChange, event, onSuccess, onDelete }: EditEventDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(event.title);
  const [location, setLocation] = useState(event.location);
  const [postcode, setPostcode] = useState((event as any).postcode || "");
  const [country, setCountry] = useState<CountryCode>(event.country);
  const [promotionName, setPromotionName] = useState(event.promotion_name || "");
  const [description, setDescription] = useState(event.description || "");
  const [venueName, setVenueName] = useState(event.venue_name || "");
  const [city, setCity] = useState(event.city || "");
  const [ticketEnabled, setTicketEnabled] = useState(event.ticket_enabled ?? false);
  const [status, setStatus] = useState<EventStatus>(event.status);

  useEffect(() => {
    setTitle(event.title);
    setLocation(event.location);
    setPostcode((event as any).postcode || "");
    setCountry(event.country);
    setPromotionName(event.promotion_name || "");
    setDescription(event.description || "");
    setVenueName(event.venue_name || "");
    setCity(event.city || "");
    setTicketEnabled(event.ticket_enabled ?? false);
    setStatus(event.status);
  }, [event]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      let latitude: number | null = null;
      let longitude: number | null = null;
      if (postcode.trim()) {
        const coords = await geocodePostcode(postcode);
        if (coords) {
          latitude = coords.latitude;
          longitude = coords.longitude;
        }
      }
      const { error } = await supabase
        .from("events")
        .update({
          title,
          location,
          postcode: postcode.trim() || null,
          latitude,
          longitude,
          country,
          promotion_name: promotionName || null,
          description: description || null,
          venue_name: venueName || null,
          city: city || null,
          ticket_enabled: ticketEnabled,
          status,
        } as any)
        .eq("id", event.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organiser-event", event.id] });
      queryClient.invalidateQueries({ queryKey: ["organiser-events"] });
      toast({ title: "Event updated" });
      onSuccess();
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: "Failed to update event", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").delete().eq("id", event.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organiser-events"] });
      toast({ title: "Event deleted" });
      onOpenChange(false);
      onDelete?.();
    },
    onError: (e: any) => {
      toast({ title: "Failed to delete event", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">EDIT EVENT</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Event Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Venue Name</Label>
              <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="e.g. York Hall" />
            </div>
            <div className="space-y-1">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. London" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Postcode *</Label>
              <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="e.g. E2 9PJ" />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Promotion Name</Label>
            <Input value={promotionName} onChange={(e) => setPromotionName(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="ticket_enabled"
              checked={ticketEnabled}
              onCheckedChange={(v) => setTicketEnabled(!!v)}
            />
            <Label htmlFor="ticket_enabled" className="cursor-pointer">
              Show ticket sales on public event page
            </Label>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              {status === "published" ? (
                <Globe className="h-4 w-4 text-green-500" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {status === "published" ? "Published" : "Draft"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {status === "published"
                    ? "Visible to the public"
                    : "Only visible to you"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant={status === "published" ? "outline" : "default"}
              size="sm"
              onClick={() => setStatus(status === "published" ? "draft" : "published")}
            >
              {status === "published" ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1">
                <Trash2 className="h-3 w-3" /> Delete Event
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the event and all associated fight slots. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={() => {
            if (!postcode.trim()) {
              toast({ title: "Postcode is required", description: "Please enter a valid postcode for location search.", variant: "destructive" });
              return;
            }
            updateMutation.mutate();
          }} disabled={!title || !postcode.trim() || updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
