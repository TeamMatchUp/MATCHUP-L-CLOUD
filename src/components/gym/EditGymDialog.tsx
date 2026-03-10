import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { geocodePostcode } from "@/hooks/use-postcode-search";
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
import { Trash2 } from "lucide-react";

type CountryCode = Database["public"]["Enums"]["country_code"];
const COUNTRIES = Constants.public.Enums.country_code;

interface GymData {
  id: string;
  name: string;
  location: string | null;
  city: string | null;
  address: string | null;
  postcode?: string | null;
  country: CountryCode;
  description: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
}

interface EditGymDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gym: GymData;
  onSuccess: () => void;
  onDelete?: () => void;
}

export function EditGymDialog({ open, onOpenChange, gym, onSuccess, onDelete }: EditGymDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState(gym.name);
  const [location, setLocation] = useState(gym.location || "");
  const [city, setCity] = useState(gym.city || "");
  const [address, setAddress] = useState(gym.address || "");
  const [postcode, setPostcode] = useState(gym.postcode || "");
  const [country, setCountry] = useState<CountryCode>(gym.country);
  const [description, setDescription] = useState(gym.description || "");
  const [contactEmail, setContactEmail] = useState(gym.contact_email || "");
  const [phone, setPhone] = useState(gym.phone || "");
  const [website, setWebsite] = useState(gym.website || "");

  useEffect(() => {
    setName(gym.name);
    setLocation(gym.location || "");
    setCity(gym.city || "");
    setAddress(gym.address || "");
    setCountry(gym.country);
    setDescription(gym.description || "");
    setContactEmail(gym.contact_email || "");
    setPhone(gym.phone || "");
    setWebsite(gym.website || "");
  }, [gym]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("gyms")
        .update({
          name,
          location: location || null,
          city: city || null,
          address: address || null,
          country,
          description: description || null,
          contact_email: contactEmail || null,
          phone: phone || null,
          website: website || null,
        })
        .eq("id", gym.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym", gym.id] });
      queryClient.invalidateQueries({ queryKey: ["owner-gyms"] });
      toast({ title: "Gym updated" });
      onSuccess();
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: "Failed to update gym", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("gyms").delete().eq("id", gym.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-gyms"] });
      toast({ title: "Gym deleted" });
      onOpenChange(false);
      onDelete?.();
    },
    onError: (e: any) => {
      toast({ title: "Failed to delete gym", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">EDIT GYM</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Gym Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. East London" />
            </div>
            <div className="space-y-1">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. London" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
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
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Contact Email</Label>
              <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1">
                <Trash2 className="h-3 w-3" /> Delete Gym
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this gym?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the gym and unlink all fighters. This action cannot be undone.
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

          <Button onClick={() => updateMutation.mutate()} disabled={!name || updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
