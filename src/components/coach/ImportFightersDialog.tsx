import { useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Upload, FileText, AlertCircle, CheckCircle2, UserPlus, Link2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatEnum } from "@/lib/format";
import { ALL_COUNTRIES } from "@/lib/countries";
import type { Database } from "@/integrations/supabase/types";

type WeightClass = Database["public"]["Enums"]["weight_class"];
type FightingStyle = Database["public"]["Enums"]["fighting_style"];

const VALID_WEIGHT_CLASSES: WeightClass[] = [
  "strawweight", "flyweight", "bantamweight", "featherweight", "lightweight",
  "super_lightweight", "welterweight", "super_welterweight", "middleweight",
  "super_middleweight", "light_heavyweight", "cruiserweight", "heavyweight", "super_heavyweight",
];

const VALID_STYLES: FightingStyle[] = ["boxing", "muay_thai", "mma", "kickboxing", "bjj"];
const VALID_STANCES = ["orthodox", "southpaw", "switch"];
const VALID_COUNTRY_CODES = ALL_COUNTRIES.map((c) => c.code);

const REQUIRED_HEADERS = ["first_name", "last_name"];
const ALL_HEADERS = [
  "first_name", "last_name", "email", "weight_class", "wins", "losses", "draws",
  "country", "discipline", "style", "stance", "date_of_birth",
  "height_cm", "reach_cm", "walk_around_weight_kg",
  "amateur_wins", "amateur_losses", "amateur_draws",
];

interface ImportRow {
  first_name: string;
  last_name: string;
  email: string;
  weight_class: string;
  wins: string;
  losses: string;
  draws: string;
  country: string;
  discipline: string;
  style: string;
  stance: string;
  date_of_birth: string;
  height_cm: string;
  reach_cm: string;
  walk_around_weight_kg: string;
  amateur_wins: string;
  amateur_losses: string;
  amateur_draws: string;
  _raw: Record<string, string>;
}

type RowAction = "create" | "link" | "error";

interface PreviewRow {
  row: ImportRow;
  action: RowAction;
  reason: string;
  existingFighterId?: string;
}

interface ImportSummary {
  created: number;
  linked: number;
  skipped: number;
  errors: string[];
}

interface ImportFightersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachId: string;
  gymId: string;
  gymName: string;
  onSuccess: () => void;
}

type Step = "upload" | "preview" | "importing" | "summary";

export function ImportFightersDialog({ open, onOpenChange, coachId, gymId, gymName, onSuccess }: ImportFightersDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setPreviewRows([]);
    setSummary(null);
    setFileName("");
  }, []);

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ""; });
      return obj;
    });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const text = await file.text();
    const rawRows = parseCSV(text);

    if (rawRows.length === 0) {
      toast({ title: "Empty CSV", description: "No data rows found in the file.", variant: "destructive" });
      return;
    }

    const headers = Object.keys(rawRows[0]);
    const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      toast({ title: "Missing columns", description: `Required columns missing: ${missingHeaders.join(", ")}`, variant: "destructive" });
      return;
    }

    const rows: ImportRow[] = rawRows.map((r) => ({
      first_name: r.first_name || "",
      last_name: r.last_name || "",
      email: (r.email || "").toLowerCase().trim(),
      weight_class: (r.weight_class || "").toLowerCase().replace(/\s+/g, "_"),
      wins: r.wins || "0",
      losses: r.losses || "0",
      draws: r.draws || "0",
      country: (r.country || "").toUpperCase().trim(),
      discipline: r.discipline || "",
      style: (r.style || "").toLowerCase().replace(/\s+/g, "_"),
      stance: (r.stance || "").toLowerCase().trim(),
      date_of_birth: r.date_of_birth || "",
      height_cm: r.height_cm || "",
      reach_cm: r.reach_cm || "",
      walk_around_weight_kg: r.walk_around_weight_kg || "",
      amateur_wins: r.amateur_wins || "0",
      amateur_losses: r.amateur_losses || "0",
      amateur_draws: r.amateur_draws || "0",
      _raw: r,
    }));

    // Check existing fighters by email
    const emails = rows.filter((r) => r.email).map((r) => r.email);
    let existingByEmail = new Map<string, string>();

    if (emails.length > 0) {
      const { data } = await supabase
        .from("fighter_profiles")
        .select("id, email")
        .in("email", emails);
      (data || []).forEach((f) => {
        if (f.email) existingByEmail.set(f.email.toLowerCase(), f.id);
      });
    }

    // Check existing gym links
    const existingFighterIds = Array.from(existingByEmail.values());
    let alreadyLinked = new Set<string>();
    if (existingFighterIds.length > 0) {
      const { data: links } = await supabase
        .from("fighter_gym_links")
        .select("fighter_id")
        .eq("gym_id", gymId)
        .in("fighter_id", existingFighterIds);
      (links || []).forEach((l) => alreadyLinked.add(l.fighter_id));
    }

    const preview: PreviewRow[] = rows.map((row) => {
      if (!row.first_name || !row.last_name) {
        return { row, action: "error", reason: "Missing first_name or last_name" };
      }
      if (!row.weight_class) {
        return { row, action: "error", reason: "Missing weight_class (required)" };
      }
      if (!VALID_WEIGHT_CLASSES.includes(row.weight_class as WeightClass)) {
        return { row, action: "error", reason: `Invalid weight_class: ${row.weight_class}` };
      }
      if (row.country && !VALID_COUNTRY_CODES.includes(row.country as any)) {
        return { row, action: "error", reason: `Invalid country code: ${row.country}` };
      }
      if (row.style && !VALID_STYLES.includes(row.style as any)) {
        return { row, action: "error", reason: `Invalid style: ${row.style}` };
      }
      if (row.stance && !VALID_STANCES.includes(row.stance)) {
        return { row, action: "error", reason: `Invalid stance: ${row.stance}` };
      }
      if (row.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(row.date_of_birth)) {
        return { row, action: "error", reason: `Invalid date_of_birth format (use YYYY-MM-DD)` };
      }
      if (row.email && existingByEmail.has(row.email)) {
        const fid = existingByEmail.get(row.email)!;
        if (alreadyLinked.has(fid)) {
          return { row, action: "error", reason: "Already linked to this gym", existingFighterId: fid };
        }
        return { row, action: "link", reason: "Existing fighter — will link to gym", existingFighterId: fid };
      }
      return { row, action: "create", reason: "New fighter profile will be created" };
    });

    setPreviewRows(preview);
    setStep("preview");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    setStep("importing");
    const result: ImportSummary = { created: 0, linked: 0, skipped: 0, errors: [] };

    for (const pr of previewRows) {
      if (pr.action === "error") {
        result.skipped++;
        result.errors.push(`${pr.row.first_name} ${pr.row.last_name}: ${pr.reason}`);
        continue;
      }

      try {
        if (pr.action === "link" && pr.existingFighterId) {
          const { error } = await supabase.from("fighter_gym_links").insert({
            fighter_id: pr.existingFighterId,
            gym_id: gymId,
            status: "approved",
          });
          if (error) throw error;
          result.linked++;
        } else if (pr.action === "create") {
          const wc = pr.row.weight_class as WeightClass;
          const insertData: Record<string, any> = {
            name: `${pr.row.first_name} ${pr.row.last_name}`,
            email: pr.row.email || null,
            weight_class: wc,
            record_wins: parseInt(pr.row.wins) || 0,
            record_losses: parseInt(pr.row.losses) || 0,
            record_draws: parseInt(pr.row.draws) || 0,
            amateur_wins: parseInt(pr.row.amateur_wins) || 0,
            amateur_losses: parseInt(pr.row.amateur_losses) || 0,
            amateur_draws: parseInt(pr.row.amateur_draws) || 0,
            created_by_coach_id: coachId,
          };

          // Only set optional fields if provided
          if (pr.row.country) insertData.country = pr.row.country;
          if (pr.row.discipline) insertData.discipline = pr.row.discipline;
          if (pr.row.style) insertData.style = pr.row.style as FightingStyle;
          if (pr.row.stance) insertData.stance = pr.row.stance;
          if (pr.row.date_of_birth) insertData.date_of_birth = pr.row.date_of_birth;
          if (pr.row.height_cm) insertData.height = parseInt(pr.row.height_cm) || null;
          if (pr.row.reach_cm) insertData.reach = parseInt(pr.row.reach_cm) || null;
          if (pr.row.walk_around_weight_kg) insertData.walk_around_weight_kg = parseFloat(pr.row.walk_around_weight_kg) || null;

          const { data: fighter, error: createErr } = await supabase
            .from("fighter_profiles")
            .insert(insertData)
            .select("id")
            .single();
          if (createErr) throw createErr;

          const { error: linkErr } = await supabase.from("fighter_gym_links").insert({
            fighter_id: fighter.id,
            gym_id: gymId,
            status: "approved",
          });
          if (linkErr) throw linkErr;
          result.created++;
        }
      } catch (err: any) {
        result.skipped++;
        result.errors.push(`${pr.row.first_name} ${pr.row.last_name}: ${err.message}`);
      }
    }

    setSummary(result);
    setStep("summary");
    if (result.created > 0 || result.linked > 0) onSuccess();
  };

  const actionCounts = {
    create: previewRows.filter((r) => r.action === "create").length,
    link: previewRows.filter((r) => r.action === "link").length,
    error: previewRows.filter((r) => r.action === "error").length,
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            IMPORT <span className="text-primary">FIGHTERS</span>
          </DialogTitle>
          <DialogDescription>
            Upload a CSV to add fighters to {gymName}
          </DialogDescription>
        </DialogHeader>

        {/* STEP: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-1">
                Upload a CSV with columns: <span className="font-medium text-foreground">first_name, last_name, weight_class</span> (required)
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Optional: email, country, discipline, style, stance, date_of_birth, height_cm, reach_cm, walk_around_weight_kg, wins, losses, draws, amateur_wins, amateur_losses, amateur_draws
              </p>
              <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
                <FileText className="h-4 w-4" /> Choose CSV File
              </Button>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm mb-2">CSV Template</p>
              <code className="block bg-background p-2 rounded text-[11px] overflow-x-auto">
                first_name,last_name,weight_class,email,country,discipline,style,stance,wins,losses,draws<br />
                John,Smith,lightweight,john@email.com,UK,Boxing,boxing,orthodox,5,2,0<br />
                Jane,Doe,bantamweight,jane@email.com,IE,MMA,mma,southpaw,3,1,1
              </code>
              <p className="mt-2 text-[11px]">
                <strong>Country codes:</strong> UK, USA, IE, FR, DE, ES, IT, NL, AUS, NZ, JP, TH, etc. (48 supported)<br />
                <strong>Styles:</strong> boxing, muay_thai, mma, kickboxing, bjj<br />
                <strong>Stances:</strong> orthodox, southpaw, switch<br />
                <strong>Date of birth:</strong> YYYY-MM-DD format
              </p>
            </div>
          </div>
        )}

        {/* STEP: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <Badge variant="outline" className="gap-1 text-xs">
                <UserPlus className="h-3 w-3" /> {actionCounts.create} to create
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs">
                <Link2 className="h-3 w-3" /> {actionCounts.link} to link
              </Badge>
              {actionCounts.error > 0 && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <AlertCircle className="h-3 w-3" /> {actionCounts.error} errors
                </Badge>
              )}
            </div>

            <div className="max-h-[40vh] overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Record</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((pr, i) => (
                    <TableRow key={i} className={pr.action === "error" ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium">{pr.row.first_name} {pr.row.last_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{pr.row.email || "—"}</TableCell>
                      <TableCell className="text-xs">{pr.row.weight_class ? formatEnum(pr.row.weight_class) : "—"}</TableCell>
                      <TableCell className="text-xs">{pr.row.country || "—"}</TableCell>
                      <TableCell className="text-xs">{pr.row.wins}W-{pr.row.losses}L-{pr.row.draws}D</TableCell>
                      <TableCell>
                        {pr.action === "create" && (
                          <span className="flex items-center gap-1 text-xs text-primary"><UserPlus className="h-3 w-3" /> Create</span>
                        )}
                        {pr.action === "link" && (
                          <span className="flex items-center gap-1 text-xs text-blue-500"><Link2 className="h-3 w-3" /> Link</span>
                        )}
                        {pr.action === "error" && (
                          <span className="flex items-center gap-1 text-xs text-destructive" title={pr.reason}><AlertCircle className="h-3 w-3" /> {pr.reason}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button
                onClick={handleImport}
                disabled={actionCounts.create + actionCounts.link === 0}
                className="gap-1"
              >
                <Upload className="h-4 w-4" /> Import {actionCounts.create + actionCounts.link} Fighters
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Importing */}
        {step === "importing" && (
          <div className="py-10 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Importing fighters…</p>
          </div>
        )}

        {/* STEP: Summary */}
        {step === "summary" && summary && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="font-heading text-2xl text-foreground">{summary.created}</p>
                <p className="text-xs text-muted-foreground">Created</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <Link2 className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                <p className="font-heading text-2xl text-foreground">{summary.linked}</p>
                <p className="text-xs text-muted-foreground">Linked</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <X className="h-5 w-5 mx-auto text-destructive mb-1" />
                <p className="font-heading text-2xl text-foreground">{summary.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
            </div>

            {summary.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 max-h-32 overflow-auto">
                <p className="text-xs font-medium text-destructive mb-1">Errors:</p>
                {summary.errors.map((e, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{e}</p>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => handleClose(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
