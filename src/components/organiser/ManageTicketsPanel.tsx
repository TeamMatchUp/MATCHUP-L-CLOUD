import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];

interface ManageTicketsPanelProps {
  eventId: string;
}

interface TicketForm {
  ticket_type: string;
  price: string;
  quantity_available: string;
  sales_start: string;
  sales_end: string;
  external_link: string;
}

const emptyForm: TicketForm = {
  ticket_type: "",
  price: "",
  quantity_available: "",
  sales_start: "",
  sales_end: "",
  external_link: "",
};

// Convert an ISO timestamp to a value the <input type="datetime-local"> control accepts.
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatSalesWindow(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const fmt = (s: string) =>
    new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  if (start && end) return `On sale ${fmt(start)} – ${fmt(end)}`;
  if (start) return `On sale from ${fmt(start)}`;
  return `On sale until ${fmt(end!)}`;
}

export function ManageTicketsPanel({ eventId }: ManageTicketsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketRow | null>(null);
  const [form, setForm] = useState<TicketForm>(emptyForm);

  const { data: tickets = [] } = useQuery({
    queryKey: ["event-tickets", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        event_id: eventId,
        ticket_type: form.ticket_type,
        price: form.price ? parseFloat(form.price) : null,
        quantity_available: form.quantity_available ? parseInt(form.quantity_available) : null,
        sales_start: form.sales_start ? new Date(form.sales_start).toISOString() : null,
        sales_end: form.sales_end ? new Date(form.sales_end).toISOString() : null,
        external_link: form.external_link || null,
      };
      if (editingTicket) {
        const { error } = await supabase.from("tickets").update(payload).eq("id", editingTicket.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tickets").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-tickets", eventId] });
      queryClient.invalidateQueries({ queryKey: ["organiser-event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      toast({ title: editingTicket ? "Ticket updated" : "Ticket added" });
      closeDialog();
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase.from("tickets").delete().eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-tickets", eventId] });
      queryClient.invalidateQueries({ queryKey: ["organiser-event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      toast({ title: "Ticket deleted" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" });
    },
  });

  const openAdd = () => {
    setEditingTicket(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (ticket: TicketRow) => {
    setEditingTicket(ticket);
    setForm({
      ticket_type: ticket.ticket_type,
      price: ticket.price?.toString() ?? "",
      quantity_available: ticket.quantity_available?.toString() ?? "",
      sales_start: isoToLocalInput(ticket.sales_start),
      sales_end: isoToLocalInput(ticket.sales_end),
      external_link: ticket.external_link ?? "",
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingTicket(null);
    setForm(emptyForm);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-2xl text-foreground">
          TICKET <span className="text-primary">SALES</span>
        </h2>
        <Button variant="outline" size="sm" className="gap-1" onClick={openAdd}>
          <Plus className="h-3 w-3" /> Add Ticket
        </Button>
      </div>

      {tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground p-4 border border-dashed border-border rounded-md text-center">
          No tickets added yet. Add ticket types with pricing and purchase links.
        </p>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const salesWindow = formatSalesWindow(ticket.sales_start, ticket.sales_end);
            return (
              <div
                key={ticket.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="text-xs">{ticket.ticket_type}</Badge>
                    {ticket.price != null && (
                      <span className="text-sm font-medium text-foreground">
                        £{Number(ticket.price).toFixed(2)}
                      </span>
                    )}
                    {ticket.quantity_available != null && (
                      <span className="text-xs text-muted-foreground">
                        {ticket.quantity_available} available
                      </span>
                    )}
                    {ticket.external_link && (
                      <a
                        href={ticket.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" /> Link
                      </a>
                    )}
                  </div>
                  {salesWindow && (
                    <span className="text-xs text-muted-foreground">{salesWindow}</span>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => openEdit(ticket)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" aria-label="Delete ticket">
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this ticket?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(ticket.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl sm:text-2xl">
              {editingTicket ? "EDIT TICKET" : "ADD TICKET"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-1">
              <Label className="text-xs sm:text-sm">Ticket Type</Label>
              <Input
                value={form.ticket_type}
                onChange={(e) => setForm({ ...form, ticket_type: e.target.value })}
                placeholder="e.g. General Admission, VIP"
                className="text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Price (£)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0.00"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Qty Available</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.quantity_available}
                  onChange={(e) => setForm({ ...form, quantity_available: e.target.value })}
                  placeholder="100"
                  className="text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Sales Start (optional)</Label>
                <Input
                  type="datetime-local"
                  value={form.sales_start}
                  onChange={(e) => setForm({ ...form, sales_start: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs sm:text-sm">Sales End (optional)</Label>
                <Input
                  type="datetime-local"
                  value={form.sales_end}
                  onChange={(e) => setForm({ ...form, sales_end: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs sm:text-sm">External Purchase Link</Label>
              <Input
                type="url"
                value={form.external_link}
                onChange={(e) => setForm({ ...form, external_link: e.target.value })}
                placeholder="https://tickets.example.com/..."
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              onClick={() => upsertMutation.mutate()}
              disabled={!form.ticket_type || upsertMutation.isPending}
              className="w-full sm:w-auto"
            >
              {upsertMutation.isPending ? "Saving..." : editingTicket ? "Save Changes" : "Add Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
