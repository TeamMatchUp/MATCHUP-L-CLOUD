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
import { BannerImageUpload } from "@/components/BannerImageUpload";

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
  discipline_tags: string | null;
  training_schedule: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  banner_image?: string | null;
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
  const [disciplineTags, setDisciplineTags] = useState<string[]>((gym.discipline_tags || "").split(",").map(s => s.trim()).filter(Boolean));
  const [trainingSchedule, setTrainingSchedule] = useState(gym.training_schedule || "");
  const [instagramUrl, setInstagramUrl] = useState(gym.instagram_url || "");
  const [facebookUrl, setFacebookUrl] = useState(gym.facebook_url || "");
  const [twitterUrl, setTwitterUrl] = useState(gym.twitter_url || "");
  const [bannerUrl, setBannerUrl] = useState<string | null>(gym.banner_image || null);

  useEffect(() => {
    setName(gym.name);
    setLocation(gym.location || "");
    setCity(gym.city || "");
    setAddress(gym.address || "");
    setPostcode(gym.postcode || "");
    setCountry(gym.country);
    setDescription(gym.description || "");
    setContactEmail(gym.contact_email || "");
    setPhone(gym.phone || "");
    setWebsite(gym.website || "");
    setDisciplineTags((gym.discipline_tags || "").split(",").map(s => s.trim()).filter(Boolean));
    setTrainingSchedule(gym.training_schedule || "");
    setInstagramUrl(gym.instagram_url || "");
    setFacebookUrl(gym.facebook_url || "");
    setTwitterUrl(gym.twitter_url || "");
    setBannerUrl(gym.banner_image || null);
  }, [gym]);

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
        .from("gyms")
        .update({
          name,
          location: location || null,
          city: city || null,
          address: address || null,
          postcode: postcode.trim() || null,
          latitude,
          longitude,
          country,
          description: description || null,
          contact_email: contactEmail || null,
          phone: phone || null,
          website: website || null,
          discipline_tags: disciplineTags.length > 0 ? disciplineTags.join(", ") : null,
          training_schedule: trainingSchedule || null,
          instagram_url: instagramUrl || null,
          facebook_url: facebookUrl || null,
          twitter_url: twitterUrl || null,
          banner_image: bannerUrl,
        } as any)
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

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
            </div>
            <div className="space-y-1">
              <Label>Postcode *</Label>
              <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="e.g. SW1A 1AA" />
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

          <div className="space-y-1">
            <Label>Disciplines</Label>
            <div className="flex flex-wrap gap-2">
              {["Boxing", "Muay Thai", "MMA", "BJJ", "Wrestling", "Kickboxing", "Judo", "Sambo", "Other"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDisciplineTags(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${disciplineTags.includes(d) ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border hover:border-primary/20"}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Training Schedule</Label>
            <Textarea value={trainingSchedule} onChange={(e) => setTrainingSchedule(e.target.value)} rows={3} placeholder="e.g. Mon-Fri: 6am-9pm, Sat: 8am-2pm" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Instagram URL</Label>
              <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." />
            </div>
            <div className="space-y-1">
              <Label>Facebook URL</Label>
              <Input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." />
            </div>
            <div className="space-y-1">
              <Label>Twitter/X URL</Label>
              <Input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="https://x.com/..." />
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

          <Button onClick={() => {
            if (!postcode.trim()) {
              toast({ title: "Postcode is required", description: "Please enter a valid postcode for location search.", variant: "destructive" });
              return;
            }
            updateMutation.mutate();
          }} disabled={!name || !postcode.trim() || updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
