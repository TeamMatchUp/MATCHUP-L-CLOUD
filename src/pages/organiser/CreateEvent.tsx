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
import { CalendarIcon, ChevronLeft, ChevronRight, Check, ArrowLeft } from "lucide-react";
import { geocodePostcode } from "@/hooks/use-postcode-search";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { SearchableCountrySelect } from "@/components/SearchableCountrySelect";
import { BannerImageUpload } from "@/components/BannerImageUpload";

type CountryCode = Database["public"]["Enums"]["country_code"];

const STEPS = [
  { id: "details", label: "Details" },
  { id: "venue", label: "Venue" },
  { id: "bouts", label: "Bouts" },
  { id: "tickets", label: "Tickets" },
  { id: "review", label: "Review" },
] as const;

export default function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const fromParam = searchParams.get("from");
  const backRoute = fromParam === "overview" ? "/dashboard?section=overview" : "/dashboard?section=events";

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
  const [stepIdx, setStepIdx] = useState(0);

  const detailsValid = title.trim().length > 0 && !!date;
  const venueValid = location.trim().length > 0 && postcode.trim().length > 0;
  const completed: boolean[] = [detailsValid, venueValid, true, true, false];

  const canVisit = (idx: number) => {
    for (let i = 0; i < idx; i++) {
      if (i === 0 && !detailsValid) return false;
      if (i === 1 && !venueValid) return false;
    }
    return true;
  };

  const next = () => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  const handleSubmit = async () => {
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
        id: eventId,
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
        banner_image: bannerUrl,
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

  const currentStep = STEPS[stepIdx].id;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-12">
          <div className="container max-w-3xl">
            <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(backRoute)}>
              <ArrowLeft className="h-4 w-4 mr-2" />{fromParam === "overview" ? "Back to Dashboard" : "Back to My Events"}
            </Button>
            <h1 className="font-heading text-4xl md:text-5xl text-foreground mb-2 tracking-wide">
              CREATE <span className="text-primary">EVENT</span>
            </h1>
            <p className="text-muted-foreground mb-8">
              Step {stepIdx + 1} of {STEPS.length} — {STEPS[stepIdx].label}
            </p>

            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex items-center gap-2">
                {STEPS.map((s, i) => {
                  const active = i === stepIdx;
                  const done = completed[i] && i < stepIdx;
                  const reachable = canVisit(i);
                  return (
                    <div key={s.id} className="flex-1 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!reachable}
                        onClick={() => reachable && setStepIdx(i)}
                        className={cn(
                          "flex items-center gap-2 flex-1 text-left transition-opacity",
                          !reachable && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <span
                          className={cn(
                            "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                            active && "bg-primary text-primary-foreground",
                            !active && done && "bg-primary/20 text-primary",
                            !active && !done && "bg-[hsl(var(--bg-raised))] text-muted-foreground"
                          )}
                        >
                          {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                        </span>
                        <span className={cn(
                          "text-sm whitespace-nowrap hidden md:block",
                          active ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {s.label}
                        </span>
                      </button>
                      {i < STEPS.length - 1 && (
                        <div className={cn(
                          "flex-1 h-[2px] rounded-full",
                          completed[i] && i < stepIdx ? "bg-primary/60" : "bg-white/5"
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)] space-y-6">
              {currentStep === "details" && (
                <>
                  <div className="space-y-2">
                    <Label>Banner Image</Label>
                    <BannerImageUpload
                      bucket="event-images"
                      entityId={eventId}
                      currentUrl={bannerUrl}
                      onUploaded={(url) => setBannerUrl(url)}
                      onRemoved={() => setBannerUrl(null)}
                    />
                  </div>
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
                      <SearchableCountrySelect value={country} onValueChange={(v) => setCountry(v as CountryCode)} />
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
                </>
              )}

              {currentStep === "venue" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location / Venue</Label>
                    <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. York Hall, London" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcode">Postcode *</Label>
                    <Input id="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="e.g. E2 9PJ" required />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
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
                </>
              )}

              {currentStep === "bouts" && (
                <div className="text-center py-8">
                  <p className="font-heading text-2xl text-foreground mb-3 tracking-wide">
                    BOUTS & <span className="text-primary">FIGHT CARD</span>
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-2">
                    Once your event is created, you'll be taken to the Event Manager where you can add fight slots, run AI matchmaking, and confirm bouts.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    No bout details needed at this step.
                  </p>
                </div>
              )}

              {currentStep === "tickets" && (
                <>
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
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={soldOut} onChange={(e) => setSoldOut(e.target.checked)} className="rounded" />
                    <span className="text-sm text-foreground">Sold Out</span>
                  </label>
                </>
              )}

              {currentStep === "review" && (
                <div className="space-y-4">
                  <p className="font-heading text-xl text-foreground tracking-wide">REVIEW & <span className="text-primary">CREATE</span></p>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div><dt className="text-xs uppercase text-muted-foreground">Title</dt><dd className="text-foreground">{title || "—"}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">Date</dt><dd className="text-foreground">{date ? format(date, "PPP") : "—"}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">Venue</dt><dd className="text-foreground">{location || "—"}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">Postcode</dt><dd className="text-foreground">{postcode || "—"}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">Country</dt><dd className="text-foreground">{country}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">Discipline</dt><dd className="text-foreground">{discipline || "Any"}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">Promotion</dt><dd className="text-foreground">{promotionName || "—"}</dd></div>
                    <div><dt className="text-xs uppercase text-muted-foreground">Tickets</dt><dd className="text-foreground">{soldOut ? "Sold out" : (ticketCount || "—")}</dd></div>
                  </dl>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-6">
              <Button variant="ghost" onClick={back} disabled={stepIdx === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              {currentStep === "review" ? (
                <Button onClick={handleSubmit} disabled={loading || !detailsValid || !venueValid} variant="hero">
                  {loading ? "Creating..." : "Create Event"}
                </Button>
              ) : (
                <Button
                  onClick={next}
                  disabled={
                    (currentStep === "details" && !detailsValid) ||
                    (currentStep === "venue" && !venueValid)
                  }
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
