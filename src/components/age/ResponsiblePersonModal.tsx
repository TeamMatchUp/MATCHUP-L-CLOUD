import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

interface Props {
  open: boolean;
  onConfirmed: () => void;
}

const RESPONSIBLE_PERSON_VERSION = 1;

export function ResponsiblePersonModal({ open, onConfirmed }: Props) {
  const [name, setName] = useState("");
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { user } = useAuth();

  const submit = async () => {
    if (!name.trim() || !checked) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("record_responsible_person", {
        _name: name.trim(),
        _version: RESPONSIBLE_PERSON_VERSION,
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profile-responsible-person", user?.id] });
      toast.success("Thanks — your account is now unlocked");
      onConfirmed();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save confirmation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="border-0 bg-card sm:max-w-[520px] [&>button]:hidden"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)" }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <DialogTitle className="font-heading text-xl tracking-wide">Parental / guardian confirmation</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            You're under 18, so we need confirmation from the adult with parental responsibility for you
            before you can use MatchUp. Enter their full name and confirm they have approved your use of
            the platform.
          </p>
          <p>
            While you're under 18: no profile photo is shown, your address and location are hidden, and
            you are excluded from location-based search and matching.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Full name of responsible adult</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Smith" />
        </div>

        <label className="flex items-start gap-3 rounded-md bg-muted/30 p-3 cursor-pointer">
          <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} className="mt-0.5" />
          <span className="text-sm text-foreground">
            I confirm the person named above has parental responsibility for me and has approved my use
            of MatchUp.
          </span>
        </label>

        <DialogFooter>
          <Button onClick={submit} disabled={!name.trim() || !checked || saving} className="w-full">
            {saving ? "Saving..." : "Confirm & continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
