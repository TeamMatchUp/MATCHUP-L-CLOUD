import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  external_link: string;
}

const emptyForm: TicketForm = {
  ticket_type: "",
  price: "",
  quantity_available: "",
  external_link: "",
};

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
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center gap-4 flex-wrap">
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
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(ticket)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm">
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
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {editingTicket ? "EDIT TICKET" : "ADD TICKET"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Ticket Type</Label>
              <Input
                value={form.ticket_type}
                onChange={(e) => setForm({ ...form, ticket_type: e.target.value })}
                placeholder="e.g. General Admission, VIP, Ringside"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Price (£)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label>Quantity Available</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.quantity_available}
                  onChange={(e) => setForm({ ...form, quantity_available: e.target.value })}
                  placeholder="100"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>External Purchase Link</Label>
              <Input
                type="url"
                value={form.external_link}
                onChange={(e) => setForm({ ...form, external_link: e.target.value })}
                placeholder="https://tickets.example.com/..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => upsertMutation.mutate()}
              disabled={!form.ticket_type || upsertMutation.isPending}
            >
              {upsertMutation.isPending ? "Saving..." : editingTicket ? "Save Changes" : "Add Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
