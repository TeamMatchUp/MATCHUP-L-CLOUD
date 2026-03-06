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

type WeightClass = Database["public"]["Enums"]["weight_class"];
type CountryCode = Database["public"]["Enums"]["country_code"];

const WEIGHT_CLASSES = Constants.public.Enums.weight_class;
const COUNTRIES = Constants.public.Enums.country_code;

function formatWeightClass(wc: string) {
  return wc.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface SlotRow {
  id: string;
  weight_class: WeightClass;
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
  const [slots, setSlots] = useState<SlotRow[]>([
    { id: crypto.randomUUID(), weight_class: "lightweight" },
  ]);
  const [loading, setLoading] = useState(false);

  const addSlot = () => {
    setSlots((prev) => [
      ...prev,
      { id: crypto.randomUUID(), weight_class: "lightweight" },
    ]);
  };

  const removeSlot = (id: string) => {
    if (slots.length <= 1) return;
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSlotWeight = (id: string, wc: WeightClass) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, weight_class: wc } : s))
    );
  };

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
              Set up a new event and define fight slots.
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

              {/* Fight Slots */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Fight Slots</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSlot}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Slot
                  </Button>
                </div>

                <div className="space-y-2">
                  {slots.map((slot, i) => (
                    <div
                      key={slot.id}
                      className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
                    >
                      <span className="text-sm font-medium text-muted-foreground w-8">
                        #{i + 1}
                      </span>
                      <Select
                        value={slot.weight_class}
                        onValueChange={(v) =>
                          updateSlotWeight(slot.id, v as WeightClass)
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEIGHT_CLASSES.map((wc) => (
                            <SelectItem key={wc} value={wc}>
                              {formatWeightClass(wc)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  ))}
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
