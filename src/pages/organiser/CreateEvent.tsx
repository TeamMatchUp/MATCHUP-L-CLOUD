import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { geocodePostcode } from "@/hooks/use-postcode-search";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type WeightClass = Database["public"]["Enums"]["weight_class"];
type CountryCode = Database["public"]["Enums"]["country_code"];

const WEIGHT_CLASSES = Constants.public.Enums.weight_class;
const COUNTRIES = Constants.public.Enums.country_code;

const EXPERIENCE_LEVELS = ["debut", "amateur", "semi-pro", "professional"] as const;

import { formatEnum } from "@/lib/format";

interface SlotRow {
  id: string;
  weight_class: WeightClass;
  card_position: string;
  experience_level: string;
  min_weight_kg: string;
  max_weight_kg: string;
  min_wins: string;
  max_wins: string;
}

function createSlot(cardPosition: string = "undercard"): SlotRow {
  return {
    id: crypto.randomUUID(),
    weight_class: "lightweight",
    card_position: cardPosition,
    experience_level: "",
    min_weight_kg: "",
    max_weight_kg: "",
    min_wins: "",
    max_wins: "",
  };
}

// Steps for progress bar
const STEPS = ["Details", "Fight card", "Review"];

export default function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date>();
  const [location, setLocation] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState<CountryCode>("UK");
  const [promotionName, setPromotionName] = useState("");
  const [description, setDescription] = useState("");
  const [slots, setSlots] = useState<SlotRow[]>([createSlot("main_card")]);
  const [loading, setLoading] = useState(false);

  const addSlot = (cardPosition: string) => {
    setSlots((prev) => [...prev, createSlot(cardPosition)]);
  };

  const removeSlot = (id: string) => {
    if (slots.length <= 1) return;
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSlot = (id: string, field: keyof SlotRow, value: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const mainCardSlots = slots.filter((s) => s.card_position === "main_card");
  const undercardSlots = slots.filter((s) => s.card_position === "undercard");

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
        organiser_id: user.id,
        status: "draft",
      } as any)
      .select("id")
      .single();

    if (eventError || !event) {
      setLoading(false);
      toast({
        title: "Error creating event",
        description: eventError?.message || "Unknown error",
        variant: "destructive",
      });
      return;
    }

    const slotInserts = slots.map((s, i) => ({
      event_id: event.id,
      weight_class: s.weight_class,
      slot_number: i + 1,
      status: "open" as const,
      card_position: s.card_position,
      experience_level: s.experience_level || null,
      min_weight_kg: s.min_weight_kg ? parseFloat(s.min_weight_kg) : null,
      max_weight_kg: s.max_weight_kg ? parseFloat(s.max_weight_kg) : null,
      min_wins: s.min_wins ? parseInt(s.min_wins) : null,
      max_wins: s.max_wins ? parseInt(s.max_wins) : null,
    }));

    const { error: slotError } = await supabase
      .from("fight_slots")
      .insert(slotInserts);

    setLoading(false);

    if (slotError) {
      toast({
        title: "Event created but slots failed",
        description: slotError.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Event created", description: "Your event is saved as a draft." });
    }

    navigate(`/organiser/events/${event.id}`);
  };

  const renderSlotRow = (slot: SlotRow, index: number) => (
    <div
      key={slot.id}
      className="mu-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--mu-t2)] font-medium">
          Fight #{index + 1}
        </span>
        <button
          type="button"
          onClick={() => removeSlot(slot.id)}
          disabled={slots.length <= 1}
          className="mu-btn-inline text-[var(--mu-t3)] hover:text-destructive disabled:opacity-30"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="mu-label">Weight class</label>
          <Select
            value={slot.weight_class}
            onValueChange={(v) => updateSlot(slot.id, "weight_class", v)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEIGHT_CLASSES.map((wc) => (
                <SelectItem key={wc} value={wc}>
                  {formatEnum(wc)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="mu-label">Experience level</label>
          <Select
            value={slot.experience_level || "any"}
            onValueChange={(v) => updateSlot(slot.id, "experience_level", v === "any" ? "" : v)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {EXPERIENCE_LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {formatEnum(l)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="mu-label">Weight range (kg)</label>
          <div className="flex gap-1">
            <input
              type="number"
              placeholder="Min"
              value={slot.min_weight_kg}
              onChange={(e) => updateSlot(slot.id, "min_weight_kg", e.target.value)}
              className="mu-input h-9 text-xs"
            />
            <input
              type="number"
              placeholder="Max"
              value={slot.max_weight_kg}
              onChange={(e) => updateSlot(slot.id, "max_weight_kg", e.target.value)}
              className="mu-input h-9 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1 col-span-2 md:col-span-1">
          <label className="mu-label">Win record range</label>
          <div className="flex gap-1">
            <input
              type="number"
              placeholder="Min wins"
              value={slot.min_wins}
              onChange={(e) => updateSlot(slot.id, "min_wins", e.target.value)}
              className="mu-input h-9 text-xs"
            />
            <input
              type="number"
              placeholder="Max wins"
              value={slot.max_wins}
              onChange={(e) => updateSlot(slot.id, "max_wins", e.target.value)}
              className="mu-input h-9 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--mu-bg)]">
      <Header />
      <main className="pt-16">
        <section className="py-10 md:py-16">
          <div className="container max-w-2xl">
            <h1 className="text-2xl md:text-4xl font-medium text-[var(--mu-t1)] mb-2">
              Create <span className="text-[var(--mu-gold)]">event</span>
            </h1>
            <p className="text-[var(--mu-t3)] text-mu-md mb-6">
              Set up a new event with main card and undercard fights.
            </p>

            {/* Progress bar */}
            <div className="mu-progress">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className={`mu-progress-step ${i < step ? "done" : i === step ? "active" : ""}`}
                />
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="title" className="mu-label">Event title</label>
                <input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. London Fight Night"
                  required
                  className="mu-input"
                  onFocus={() => setStep(0)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="mu-label">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-[var(--mu-t3)]"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(d) => d < new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="mu-label">Country</label>
                  <Select
                    value={country}
                    onValueChange={(v) => setCountry(v as CountryCode)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="location" className="mu-label">Location / Venue</label>
                  <input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. York Hall, London"
                    required
                    className="mu-input"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="postcode" className="mu-label">Postcode *</label>
                  <input
                    id="postcode"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder="e.g. E2 9PJ"
                    required
                    className="mu-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="promotion" className="mu-label">Promotion name (optional)</label>
                <input
                  id="promotion"
                  value={promotionName}
                  onChange={(e) => setPromotionName(e.target.value)}
                  placeholder="e.g. Cage Warriors"
                  className="mu-input"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="mu-label">Description (optional)</label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Event details, rules, etc."
                  rows={3}
                  className="bg-[var(--mu-sur)] border-[var(--mu-border)] text-[var(--mu-t1)] focus:border-[var(--mu-gold-b)] transition-colors duration-150"
                />
              </div>

              {/* Main Card */}
              <div className="space-y-3" onFocus={() => setStep(1)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--mu-t1)]">Main card</span>
                    <span className="mu-pill mu-pill-proposed">{mainCardSlots.length} fights</span>
                  </div>
                  <button
                    type="button"
                    className="mu-btn-inline"
                    onClick={() => addSlot("main_card")}
                  >
                    <Plus className="h-3 w-3" /> Add fight
                  </button>
                </div>
                <div className="space-y-2">
                  {mainCardSlots.map((slot, i) => renderSlotRow(slot, i))}
                  {mainCardSlots.length === 0 && (
                    <p className="text-sm text-[var(--mu-t3)] p-4 border border-dashed border-[var(--mu-border)] rounded-mu-md text-center">
                      No main card fights yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Undercard */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--mu-t1)]">Undercard</span>
                    <span className="mu-pill mu-pill-pending">{undercardSlots.length} fights</span>
                  </div>
                  <button
                    type="button"
                    className="mu-btn-inline"
                    onClick={() => addSlot("undercard")}
                  >
                    <Plus className="h-3 w-3" /> Add fight
                  </button>
                </div>
                <div className="space-y-2">
                  {undercardSlots.map((slot, i) => renderSlotRow(slot, i))}
                  {undercardSlots.length === 0 && (
                    <p className="text-sm text-[var(--mu-t3)] p-4 border border-dashed border-[var(--mu-border)] rounded-mu-md text-center">
                      No undercard fights yet.
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="mu-btn-primary w-full text-center"
                disabled={loading || !date || !postcode.trim()}
              >
                {loading ? "Creating..." : "Create event"}
              </button>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
