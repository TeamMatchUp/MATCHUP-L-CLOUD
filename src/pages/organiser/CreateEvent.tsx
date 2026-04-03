import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin } from "lucide-react";
import { geocodePostcode } from "@/hooks/use-postcode-search";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { BannerImageUpload } from "@/components/BannerImageUpload";

type CountryCode = Database["public"]["Enums"]["country_code"];
const COUNTRIES = Constants.public.Enums.country_code;

export default function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const fromParam = searchParams.get("from");
  const backRoute = fromParam === "overview" ? "/dashboard?section=overview" : "/dashboard?section=events";

  // Generate a stable UUID for the event so we can upload the banner before insert
  const [eventId] = useState(() => crypto.randomUUID());
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date>();
  const [location, setLocation] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState<CountryCode>("UK");
  const [promotionName, setPromotionName] = useState("");
  const [description, setDescription] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");
  const [ticketsUrl, setTicketsUrl] = useState("");
  const [ticketCount, setTicketCount] = useState("");
  const [soldOut, setSoldOut] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !user || !postcode.trim()) return;

    setLoading(true);

    let latitude: number | null = null;
    let longitude: number | null = null;
    if (postcode.trim()) {
      const coords = await geocodePostcode(postcode);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        title,
        date: format(date, "yyyy-MM-dd"),
        location,
        postcode: postcode.trim(),
        latitude,
        longitude,
        country,
        promotion_name: promotionName || null,
        description: description || null,
        discipline: discipline || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        contact_website: contactWebsite || null,
        tickets_url: ticketsUrl || null,
        ticket_count: ticketCount ? parseInt(ticketCount) : null,
        sold_out: soldOut,
        organiser_id: user.id,
        status: "draft",
      } as any)
      .select("id")
      .single();

    setLoading(false);

    if (eventError || !event) {
      toast({
        title: "Error creating event",
        description: eventError?.message || "Unknown error",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Event created", description: "Your event is saved as a draft." });
    navigate(`/organiser/events/${event.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container max-w-2xl">
            <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(backRoute)}>
              <MapPin className="h-4 w-4 mr-2" />{fromParam === "overview" ? "Back to Dashboard" : "Back to My Events"}
            </Button>
            <h1 className="font-heading text-4xl md:text-5xl text-foreground mb-2">
              CREATE <span className="text-primary">EVENT</span>
            </h1>
            <p className="text-muted-foreground mb-8">
              Set up a new event. You can add fight slots after creation from the event management page.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. London Fight Night" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location / Venue</Label>
                  <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. York Hall, London" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode *</Label>
                  <Input id="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="e.g. E2 9PJ" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="promotion">Promotion Name (optional)</Label>
                  <Input id="promotion" value={promotionName} onChange={(e) => setPromotionName(e.target.value)} placeholder="e.g. Cage Warriors" />
                </div>
                <div className="space-y-2">
                  <Label>Discipline</Label>
                  <Select value={discipline || "none"} onValueChange={(v) => setDiscipline(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any</SelectItem>
                      {Constants.public.Enums.fighting_style.map((s) => (<SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Event details, rules, etc." rows={3} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input id="contactPhone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+44..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactWebsite">Contact Website</Label>
                  <Input id="contactWebsite" value={contactWebsite} onChange={(e) => setContactWebsite(e.target.value)} placeholder="https://..." />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticketsUrl">Tickets URL</Label>
                  <Input id="ticketsUrl" value={ticketsUrl} onChange={(e) => setTicketsUrl(e.target.value)} placeholder="https://tickets.example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticketCount">Ticket Count</Label>
                  <Input id="ticketCount" type="number" value={ticketCount} onChange={(e) => setTicketCount(e.target.value)} placeholder="e.g. 500" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={soldOut} onChange={(e) => setSoldOut(e.target.checked)} className="rounded border-border" />
                  <span className="text-sm text-foreground">Sold Out</span>
                </label>
              </div>

              <Button type="submit" variant="hero" className="w-full" disabled={loading || !date || !postcode.trim()}>
                {loading ? "Creating..." : "Create Event"}
              </Button>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}