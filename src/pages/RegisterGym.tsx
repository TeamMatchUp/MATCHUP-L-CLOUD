import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { geocodePostcode } from "@/hooks/use-postcode-search";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";

type CountryCode = Database["public"]["Enums"]["country_code"];
const COUNTRIES = Constants.public.Enums.country_code;

export default function RegisterGym() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState<CountryCode>("UK");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");

  const createGymMutation = useMutation({
    mutationFn: async () => {
      // Geocode postcode for lat/lng
      let latitude: number | null = null;
      let longitude: number | null = null;
      if (postcode.trim()) {
        const coords = await geocodePostcode(postcode);
        if (coords) {
          latitude = coords.latitude;
          longitude = coords.longitude;
        }
      }
      const { error } = await supabase.from("gyms").insert({
        name,
        location: location || null,
        country,
        city: city || null,
        address: address || null,
        postcode: postcode.trim() || null,
        latitude,
        longitude,
        contact_email: contactEmail || null,
        phone: phone || null,
        website: website || null,
        description: description || null,
        coach_id: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Gym registered!", description: "Welcome to your Coach Dashboard." });
      navigate("/gym-owner/dashboard", { replace: true });
    },
    onError: (e: any) => {
      toast({ title: "Failed to register gym", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="h-8 w-8 text-primary" />
                <h1 className="font-heading text-4xl md:text-5xl text-foreground">
                  REGISTER <span className="text-primary">YOUR GYM</span>
                </h1>
              </div>
              <p className="text-muted-foreground mb-8">
                Before you can access your Coach Dashboard, you need to register at least one gym.
              </p>

              <div className="rounded-lg border border-border bg-card p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Gym Name *</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Tiger Muay Thai"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country *</Label>
                    <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
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
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. London"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 123 Fight Street"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Postcode *</Label>
                    <Input
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      placeholder="e.g. SW1A 1AA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location / Area</Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. East London"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="gym@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+44 7700 900000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://yourgym.com"
                    />
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell fighters about your gym, training style, and facilities..."
                    rows={3}
                  />
                </div>
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={() => createGymMutation.mutate()}
                  disabled={!name || createGymMutation.isPending}
                >
                  {createGymMutation.isPending ? "Registering..." : "Register Gym & Continue"}
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
