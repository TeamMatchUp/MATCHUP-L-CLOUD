import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShieldCheck, Building2, Clock, CheckCircle, XCircle, Calendar, Inbox } from "lucide-react";
import { format } from "date-fns";

function AdminSummary() {
  const { data } = useQuery({
    queryKey: ["admin-gym-summary"],
    queryFn: async () => {
      const total = await supabase.from("gyms").select("id", { count: "exact", head: true });
      const unclaimed = await supabase.from("gyms").select("id", { count: "exact", head: true }).eq("claimed", false);
      const claimed = await supabase.from("gyms").select("id", { count: "exact", head: true }).eq("claimed", true);
      const pending = await supabase.from("gym_claims").select("id", { count: "exact", head: true }).eq("status", "pending");
      const eventClaims = await supabase.from("event_claims" as any).select("id", { count: "exact", head: true }).eq("status", "pending");
      const pendingGyms = await (supabase.from("gyms") as any).select("id", { count: "exact", head: true }).eq("review_status", "pending");
      const pendingEvents = await (supabase.from("events") as any).select("id", { count: "exact", head: true }).eq("review_status", "pending");
      return {
        total: total.count ?? 0,
        unclaimed: unclaimed.count ?? 0,
        claimed: claimed.count ?? 0,
        pending: pending.count ?? 0,
        eventClaims: (eventClaims as any).count ?? 0,
        pendingGyms: (pendingGyms as any).count ?? 0,
        pendingEvents: (pendingEvents as any).count ?? 0,
      };
    },
  });

  const stats = [
    { label: "Total Gyms", value: data?.total ?? 0, icon: Building2 },
    { label: "Pending Gym Reviews", value: data?.pendingGyms ?? 0, icon: Inbox },
    { label: "Pending Event Reviews", value: data?.pendingEvents ?? 0, icon: Inbox },
    { label: "Pending Gym Claims", value: data?.pending ?? 0, icon: Clock },
    { label: "Pending Event Claims", value: data?.eventClaims ?? 0, icon: Calendar },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.map((s) => (
        <Card key={s.label} className="bg-card border-border/40 p-4 flex items-center gap-3">
          <s.icon className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-2xl font-heading text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

function GymClaimsTable() {
  const queryClient = useQueryClient();

  const { data: claims, isLoading } = useQuery({
    queryKey: ["admin-gym-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gym_claims")
        .select("*, gyms(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const approve = useMutation({
    mutationFn: async (claim: any) => {
      const { error } = await supabase.rpc("approve_gym_claim" as any, { _claim_id: claim.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Claim approved" });
      queryClient.invalidateQueries({ queryKey: ["admin-gym-claims"] });
      queryClient.invalidateQueries({ queryKey: ["admin-gym-summary"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to approve claim.", variant: "destructive" }),
  });

  const reject = useMutation({
    mutationFn: async (claim: any) => {
      const gymName = (claim as any).gyms?.name ?? "the gym";
      const { error } = await supabase.from("gym_claims").update({ status: "rejected" }).eq("id", claim.id);
      if (error) throw error;
      if (claim.user_id) {
        await supabase.rpc("create_notification", {
          _user_id: claim.user_id,
          _title: `Your claim for ${gymName} was not approved`,
          _message: `Your claim for ${gymName} was not approved. Please contact us if you believe this is an error.`,
          _type: "system",
          _reference_id: claim.gym_id,
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Claim rejected" });
      queryClient.invalidateQueries({ queryKey: ["admin-gym-claims"] });
      queryClient.invalidateQueries({ queryKey: ["admin-gym-summary"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to reject claim.", variant: "destructive" }),
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading claims…</p>;
  if (!claims?.length) return <p className="text-muted-foreground text-sm">No gym claims yet.</p>;

  return (
    <div className="rounded-lg border border-border/40 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Gym</TableHead>
            <TableHead>Claimant</TableHead>
            <TableHead className="hidden sm:table-cell">Email</TableHead>
            <TableHead className="hidden md:table-cell">Role</TableHead>
            <TableHead className="hidden md:table-cell">Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {claims.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{(c as any).gyms?.name ?? "Unknown"}</TableCell>
              <TableCell>{c.claimant_name}</TableCell>
              <TableCell className="hidden sm:table-cell">{c.claimant_email}</TableCell>
              <TableCell className="hidden md:table-cell capitalize">{c.claimant_role}</TableCell>
              <TableCell className="hidden md:table-cell">{format(new Date(c.created_at), "dd MMM yyyy")}</TableCell>
              <TableCell>
                <Badge variant={c.status === "approved" ? "default" : c.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">
                  {c.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {c.status === "pending" && (
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-green-600/40 text-green-500 hover:bg-green-600/10" onClick={() => approve.mutate(c)} disabled={approve.isPending}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => reject.mutate(c)} disabled={reject.isPending}>
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EventClaimsTable() {
  const queryClient = useQueryClient();

  const { data: claims, isLoading } = useQuery({
    queryKey: ["admin-event-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_claims" as any)
        .select("*, events(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const approve = useMutation({
    mutationFn: async (claim: any) => {
      // Set event organiser_id
      const { error: evError } = await supabase
        .from("events")
        .update({ organiser_id: claim.user_id })
        .eq("id", claim.event_id);
      if (evError) throw evError;

      // Update claim status
      await supabase.from("event_claims" as any).update({ status: "approved" } as any).eq("id", claim.id);

      // Grant organiser role
      if (claim.user_id) {
        await supabase.from("user_roles").insert({ user_id: claim.user_id, role: "organiser" } as any);
        await supabase.rpc("create_notification", {
          _user_id: claim.user_id,
          _title: `Your claim for ${claim.events?.title ?? "the event"} has been approved`,
          _message: `You now have organiser access to manage this event.`,
          _type: "system",
          _reference_id: claim.event_id,
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Event claim approved" });
      queryClient.invalidateQueries({ queryKey: ["admin-event-claims"] });
      queryClient.invalidateQueries({ queryKey: ["admin-gym-summary"] });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const reject = useMutation({
    mutationFn: async (claim: any) => {
      await supabase.from("event_claims" as any).update({ status: "rejected" } as any).eq("id", claim.id);
      if (claim.user_id) {
        await supabase.rpc("create_notification", {
          _user_id: claim.user_id,
          _title: `Your claim for ${claim.events?.title ?? "the event"} was not approved`,
          _message: `Please contact us if you believe this is an error.`,
          _type: "system",
          _reference_id: claim.event_id,
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Event claim rejected" });
      queryClient.invalidateQueries({ queryKey: ["admin-event-claims"] });
      queryClient.invalidateQueries({ queryKey: ["admin-gym-summary"] });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (!claims?.length) return <p className="text-muted-foreground text-sm">No event claims yet.</p>;

  return (
    <div className="rounded-lg border border-border/40 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Claimant</TableHead>
            <TableHead className="hidden sm:table-cell">Email</TableHead>
            <TableHead className="hidden md:table-cell">Role</TableHead>
            <TableHead className="hidden md:table-cell">Promotion</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {claims.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.events?.title ?? "Unknown"}</TableCell>
              <TableCell>{c.claimant_name}</TableCell>
              <TableCell className="hidden sm:table-cell">{c.claimant_email}</TableCell>
              <TableCell className="hidden md:table-cell capitalize">{c.claimant_role}</TableCell>
              <TableCell className="hidden md:table-cell">{c.promotion_name || "—"}</TableCell>
              <TableCell>
                <Badge variant={c.status === "approved" ? "default" : c.status === "rejected" ? "destructive" : "secondary"} className="text-[10px]">
                  {c.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {c.status === "pending" && (
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-green-600/40 text-green-500 hover:bg-green-600/10" onClick={() => approve.mutate(c)} disabled={approve.isPending}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => reject.mutate(c)} disabled={reject.isPending}>
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RejectDialog({
  open, onOpenChange, onConfirm, kind, name, pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (reason: string) => void;
  kind: "gym" | "event";
  name: string;
  pending: boolean;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (!open) setReason(""); }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject {kind}</DialogTitle>
          <DialogDescription>
            Optionally tell the submitter why "{name}" was not approved. They'll receive a notification.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          rows={3}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" disabled={pending} onClick={() => onConfirm(reason)}>
            {pending ? "Rejecting…" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendingGymsTable() {
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<any>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-pending-gyms"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("gyms") as any)
        .select("id, name, city, country, location, created_at, coach_id")
        .eq("review_status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const coachIds = Array.from(new Set((data ?? []).map((r: any) => r.coach_id).filter(Boolean)));
      let profileMap = new Map<string, any>();
      if (coachIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", coachIds as any);
        (profs ?? []).forEach((p: any) => profileMap.set(p.id, p));
      }
      return (data ?? []).map((r: any) => ({ ...r, coach: profileMap.get(r.coach_id) }));
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-pending-gyms"] });
    queryClient.invalidateQueries({ queryKey: ["admin-pending-all"] });
    queryClient.invalidateQueries({ queryKey: ["admin-gym-summary"] });
  };

  const approve = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase.rpc("approve_gym" as any, { _gym_id: row.id });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Gym approved" }); invalidate(); },
    onError: (e: any) => toast({ title: "Failed to approve", description: e.message, variant: "destructive" }),
  });

  const reject = useMutation({
    mutationFn: async ({ row, reason }: { row: any; reason: string }) => {
      const { error } = await supabase.rpc("reject_gym" as any, { _gym_id: row.id, _reason: reason || null });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Gym rejected" }); setRejectTarget(null); invalidate(); },
    onError: (e: any) => toast({ title: "Failed to reject", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (!rows?.length) return <p className="text-muted-foreground text-sm">No gyms pending review.</p>;

  return (
    <>
      <div className="rounded-lg border border-border/40 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gym</TableHead>
              <TableHead>Submitter</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead className="hidden md:table-cell">Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.coach?.full_name ?? "—"}</TableCell>
                <TableCell className="hidden md:table-cell">{[r.city, r.location, r.country].filter(Boolean).join(", ")}</TableCell>
                <TableCell className="hidden md:table-cell">{r.created_at ? format(new Date(r.created_at), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-green-600/40 text-green-500 hover:bg-green-600/10" onClick={() => approve.mutate(r)} disabled={approve.isPending}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => setRejectTarget(r)}>
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <RejectDialog
        open={!!rejectTarget}
        onOpenChange={(v) => !v && setRejectTarget(null)}
        onConfirm={(reason) => rejectTarget && reject.mutate({ row: rejectTarget, reason })}
        kind="gym"
        name={rejectTarget?.name ?? ""}
        pending={reject.isPending}
      />
    </>
  );
}

function PendingEventsTable() {
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<any>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-pending-events"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("events") as any)
        .select("id, title, city, location, date, created_at, organiser_id")
        .eq("review_status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const orgIds = Array.from(new Set((data ?? []).map((r: any) => r.organiser_id).filter(Boolean)));
      let profileMap = new Map<string, any>();
      if (orgIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", orgIds as any);
        (profs ?? []).forEach((p: any) => profileMap.set(p.id, p));
      }
      return (data ?? []).map((r: any) => ({ ...r, organiser: profileMap.get(r.organiser_id) }));
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-pending-events"] });
    queryClient.invalidateQueries({ queryKey: ["admin-pending-all"] });
    queryClient.invalidateQueries({ queryKey: ["admin-gym-summary"] });
  };

  const approve = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase.rpc("approve_event" as any, { _event_id: row.id });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Event approved" }); invalidate(); },
    onError: (e: any) => toast({ title: "Failed to approve", description: e.message, variant: "destructive" }),
  });

  const reject = useMutation({
    mutationFn: async ({ row, reason }: { row: any; reason: string }) => {
      const { error } = await supabase.rpc("reject_event" as any, { _event_id: row.id, _reason: reason || null });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Event rejected" }); setRejectTarget(null); invalidate(); },
    onError: (e: any) => toast({ title: "Failed to reject", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (!rows?.length) return <p className="text-muted-foreground text-sm">No events pending review.</p>;

  return (
    <>
      <div className="rounded-lg border border-border/40 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Organiser</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="hidden md:table-cell">Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell>{r.organiser?.full_name ?? "—"}</TableCell>
                <TableCell className="hidden md:table-cell">{[r.city, r.location].filter(Boolean).join(", ")}</TableCell>
                <TableCell className="hidden md:table-cell">{r.date ? format(new Date(r.date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell className="hidden md:table-cell">{r.created_at ? format(new Date(r.created_at), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-green-600/40 text-green-500 hover:bg-green-600/10" onClick={() => approve.mutate(r)} disabled={approve.isPending}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => setRejectTarget(r)}>
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <RejectDialog
        open={!!rejectTarget}
        onOpenChange={(v) => !v && setRejectTarget(null)}
        onConfirm={(reason) => rejectTarget && reject.mutate({ row: rejectTarget, reason })}
        kind="event"
        name={rejectTarget?.title ?? ""}
        pending={reject.isPending}
      />
    </>
  );
}

function ReviewQueue() {
  return (
    <Tabs defaultValue="gyms">
      <TabsList>
        <TabsTrigger value="gyms"><Building2 className="h-4 w-4 mr-1" /> Gyms</TabsTrigger>
        <TabsTrigger value="events"><Calendar className="h-4 w-4 mr-1" /> Events</TabsTrigger>
      </TabsList>
      <TabsContent value="gyms" className="mt-4">
        <PendingGymsTable />
      </TabsContent>
      <TabsContent value="events" className="mt-4">
        <PendingEventsTable />
      </TabsContent>
    </Tabs>
  );
}

function EloRecomputePanel() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ updated: number; shifts: any[] } | null>(null);
  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("recompute-ratings", { body: {} });
      if (error) throw error;
      setResult(data as any);
      toast({ title: "MU Scores recomputed", description: `${(data as any)?.updated ?? 0} fighters updated.` });
    } catch (e: any) {
      toast({ title: "Recompute failed", description: e?.message ?? "Unknown error", variant: "destructive" as any });
    } finally {
      setRunning(false);
    }
  };
  return (
    <Card className="bg-card border-border/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-heading text-lg text-foreground">MU Score Recompute</h2>
          <p className="text-xs text-muted-foreground">
            Runs a full Glicko-2 replay across all fights and rewrites each fighter's rating, RD, volatility and displayed MU Score. Flags fighters whose leaderboard rank moves by more than 10 positions.
          </p>
        </div>
        <Button onClick={run} disabled={running}>
          {running ? "Recomputing…" : "Recompute MU Scores"}
        </Button>
      </div>
      {result && (
        <div className="text-sm text-muted-foreground">
          Updated <span className="text-foreground font-medium">{result.updated}</span> of{" "}
          <span className="text-foreground font-medium">{result.count}</span> fighters.
          {Array.isArray(result.report) && result.report.some((r: any) => r.flagged) && (
            <>
              {" "}Rank shifts &gt; 10:
              <ul className="mt-2 space-y-1 text-xs">
                {result.report.filter((r: any) => r.flagged).slice(0, 20).map((r: any) => (
                  <li key={r.fighter_id}>
                    {r.name}: MU {r.old_displayed} → {r.new_displayed} · rank #{r.rank_before} → #{r.rank_after}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

export default function Admin() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const isAdmin = session?.user?.app_metadata?.role === "admin";

  if (!session || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-16 container max-w-5xl space-y-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="font-heading text-2xl text-foreground">Admin Panel</h1>
        </div>

        <AdminSummary />

        <EloRecomputePanel />

        <div>
          <h2 className="font-heading text-lg text-foreground mb-3 flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" /> Review Queue
          </h2>
          <ReviewQueue />
        </div>

        <Tabs defaultValue="gym-claims">
          <TabsList>
            <TabsTrigger value="gym-claims"><Building2 className="h-4 w-4 mr-1" /> Gym Claims</TabsTrigger>
            <TabsTrigger value="event-claims"><Calendar className="h-4 w-4 mr-1" /> Event Claims</TabsTrigger>
          </TabsList>
          <TabsContent value="gym-claims">
            <GymClaimsTable />
          </TabsContent>
          <TabsContent value="event-claims">
            <EventClaimsTable />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
