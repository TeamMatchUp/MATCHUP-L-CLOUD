import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";

type WeightClass = Database["public"]["Enums"]["weight_class"];
type CountryCode = Database["public"]["Enums"]["country_code"];

const WEIGHT_CLASSES = Constants.public.Enums.weight_class;
const COUNTRIES = Constants.public.Enums.country_code;

const EXPERIENCE_LEVELS = ["debut", "amateur", "semi-pro", "professional"] as const;
const CARD_POSITIONS = ["main_card", "undercard"] as const;

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

export default function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date>();
  const [location, setLocation] = useState("");
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
    if (!date || !user) return;

    setLoading(true);

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        title,
        date: format(date, "yyyy-MM-dd"),
        location,
        country,
        promotion_name: promotionName || null,
        description: description || null,
        organiser_id: user.id,
        status: "draft",
      })
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
      className="rounded-md border border-border bg-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-heading text-muted-foreground">
          Fight #{index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => removeSlot(slot.id)}
          disabled={slots.length <= 1}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Weight Class</Label>
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
          <Label className="text-xs">Experience Level</Label>
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
          <Label className="text-xs">Weight Range (kg)</Label>
          <div className="flex gap-1">
            <Input
              type="number"
              placeholder="Min"
              value={slot.min_weight_kg}
              onChange={(e) => updateSlot(slot.id, "min_weight_kg", e.target.value)}
              className="h-9 text-xs"
            />
            <Input
              type="number"
              placeholder="Max"
              value={slot.max_weight_kg}
              onChange={(e) => updateSlot(slot.id, "max_weight_kg", e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1 col-span-2 md:col-span-1">
          <Label className="text-xs">Win Record Range</Label>
          <div className="flex gap-1">
            <Input
              type="number"
              placeholder="Min wins"
              value={slot.min_wins}
              onChange={(e) => updateSlot(slot.id, "min_wins", e.target.value)}
              className="h-9 text-xs"
            />
            <Input
              type="number"
              placeholder="Max wins"
              value={slot.max_wins}
              onChange={(e) => updateSlot(slot.id, "max_wins", e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <section className="py-16">
          <div className="container max-w-2xl">
            <h1 className="font-heading text-4xl md:text-5xl text-foreground mb-2">
              CREATE <span className="text-primary">EVENT</span>
            </h1>
            <p className="text-muted-foreground mb-8">
              Set up a new event with main card and undercard fights.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. London Fight Night"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
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
                  <Label>Country</Label>
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

              <div className="space-y-2">
                <Label htmlFor="location">Location / Venue</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. York Hall, London"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promotion">Promotion Name (optional)</Label>
                <Input
                  id="promotion"
                  value={promotionName}
                  onChange={(e) => setPromotionName(e.target.value)}
                  placeholder="e.g. Cage Warriors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Event details, rules, etc."
                  rows={3}
                />
              </div>

              {/* Main Card */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-lg font-heading">MAIN CARD</Label>
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      {mainCardSlots.length} fights
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSlot("main_card")}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Fight
                  </Button>
                </div>
                <div className="space-y-2">
                  {mainCardSlots.map((slot, i) => renderSlotRow(slot, i))}
                  {mainCardSlots.length === 0 && (
                    <p className="text-sm text-muted-foreground p-4 border border-dashed border-border rounded-md text-center">
                      No main card fights yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Undercard */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-lg font-heading">UNDERCARD</Label>
                    <Badge variant="outline">
                      {undercardSlots.length} fights
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSlot("undercard")}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Fight
                  </Button>
                </div>
                <div className="space-y-2">
                  {undercardSlots.map((slot, i) => renderSlotRow(slot, i))}
                  {undercardSlots.length === 0 && (
                    <p className="text-sm text-muted-foreground p-4 border border-dashed border-border rounded-md text-center">
                      No undercard fights yet.
                    </p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                variant="hero"
                className="w-full"
                disabled={loading || !date}
              >
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
