import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CalendarIcon, CakeIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, getMonth, getYear, setMonth, setYear } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  open: boolean;
  onSaved: () => void;
}

function DOBPicker({ value, onChange }: { value?: Date; onChange: (d?: Date) => void }) {
  const [view, setView] = useState(value || new Date(2000, 0, 1));
  const years = Array.from({ length: 90 }, (_, i) => getYear(new Date()) - i);
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Select value={String(getMonth(view))} onValueChange={(v) => setView(setMonth(view, parseInt(v)))}>
          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
          <SelectContent position="popper">{months.map((m,i)=>(<SelectItem key={m} value={String(i)}>{m}</SelectItem>))}</SelectContent>
        </Select>
        <Select value={String(getYear(view))} onValueChange={(v) => setView(setYear(view, parseInt(v)))}>
          <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
          <SelectContent position="popper">{years.map((y)=>(<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}</SelectContent>
        </Select>
      </div>
      <Calendar
        mode="single" selected={value} onSelect={onChange} month={view} onMonthChange={setView}
        disabled={(d) => d > new Date() || d < new Date("1935-01-01")}
        className={cn("p-3 pointer-events-auto")}
      />
    </div>
  );
}

export function DateOfBirthModal({ open, onSaved }: Props) {
  const [dob, setDob] = useState<Date>();
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { user } = useAuth();

  const submit = async () => {
    if (!dob) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("record_date_of_birth", { _dob: format(dob, "yyyy-MM-dd") });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["is-minor", user?.id] });
      toast.success("Date of birth saved");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save date of birth");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="border-0 bg-card sm:max-w-[480px] [&>button]:hidden"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)" }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CakeIcon className="h-5 w-5 text-primary" />
            <DialogTitle className="font-heading text-xl tracking-wide">Confirm your date of birth</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            We need your date of birth to apply the right privacy protections. Until this is set, your
            profile is treated as under-18 by default — no profile photo shown and your location is hidden
            from search.
          </p>
        </div>
        <div className="space-y-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dob && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dob ? format(dob, "PPP") : "Select date of birth"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DOBPicker value={dob} onChange={setDob} />
            </PopoverContent>
          </Popover>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!dob || saving} className="w-full">
            {saving ? "Saving..." : "Save & continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
