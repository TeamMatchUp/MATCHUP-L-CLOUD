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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShieldCheck, Building2, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

function AdminSummary() {
  const { data } = useQuery({
    queryKey: ["admin-gym-summary"],
    queryFn: async () => {
      const [total, unclaimed, claimed, pending] = await Promise.all([
        supabase.from("gyms").select("id", { count: "exact", head: true }),
        supabase.from("gyms").select("id", { count: "exact", head: true }).eq("claimed", false),
        supabase.from("gyms").select("id", { count: "exact", head: true }).eq("claimed", true),
        supabase.from("gym_claims").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return {
        total: total.count ?? 0,
        unclaimed: unclaimed.count ?? 0,
        claimed: claimed.count ?? 0,
        pending: pending.count ?? 0,
      };
    },
  });

  const stats = [
    { label: "Total Gyms", value: data?.total ?? 0, icon: Building2 },
    { label: "Unclaimed", value: data?.unclaimed ?? 0, icon: Clock },
    { label: "Claimed", value: data?.claimed ?? 0, icon: ShieldCheck },
    { label: "Pending Claims", value: data?.pending ?? 0, icon: Clock },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
      // Update claim status
      const { error: claimErr } = await supabase
        .from("gym_claims")
        .update({ status: "approved" })
        .eq("id", claim.id);
      if (claimErr) throw claimErr;

      // Set gym as claimed
      const { error: gymErr } = await supabase
        .from("gyms")
        .update({ claimed: true, listing_tier: "free" })
        .eq("id", claim.gym_id);
      if (gymErr) throw gymErr;
    },
    onSuccess: () => {
      toast({ title: "Claim approved", description: "Gym has been marked as claimed." });
      queryClient.invalidateQueries({ queryKey: ["admin-gym-claims"] });
      queryClient.invalidateQueries({ queryKey: ["admin-gym-summary"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to approve claim.", variant: "destructive" }),
  });

  const reject = useMutation({
    mutationFn: async (claimId: string) => {
      const { error } = await supabase
        .from("gym_claims")
        .update({ status: "rejected" })
        .eq("id", claimId);
      if (error) throw error;
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
                <Badge
                  variant={c.status === "approved" ? "default" : c.status === "rejected" ? "destructive" : "secondary"}
                  className="text-[10px]"
                >
                  {c.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {c.status === "pending" && (
                  <div className="flex gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-green-600/40 text-green-500 hover:bg-green-600/10"
                      onClick={() => approve.mutate(c)}
                      disabled={approve.isPending}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => reject.mutate(c.id)}
                      disabled={reject.isPending}
                    >
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

        <div>
          <h2 className="font-heading text-lg text-foreground mb-3">Gym Claims</h2>
          <GymClaimsTable />
        </div>
      </main>
      <Footer />
    </div>
  );
}
