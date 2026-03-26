import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Mail, MailOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const TYPE_LABELS: Record<string, string> = {
  match_proposed: "Match Proposal",
  match_accepted: "Match Accepted",
  match_declined: "Match Declined",
  match_confirmed: "Match Confirmed",
  match_withdrawn: "Match Withdrawn",
  event_update: "Event Update",
  system: "System",
  gym_invite: "Gym Invite",
};

export function NotificationHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  // Always fetch ALL notifications for counts
  const { data: allNotifications = [], isLoading } = useQuery({
    queryKey: ["notification-history-all", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  // Derive filtered list from the full dataset
  const filteredNotifications = allNotifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  // Fixed counts — always computed from full list, never change on filter click
  const totalCount = allNotifications.length;
  const unreadCount = allNotifications.filter((n) => !n.read).length;
  const readCount = allNotifications.filter((n) => n.read).length;

  const handleNotificationClick = async (notification: any) => {
    await supabase.from("notifications").update({ read: true }).eq("id", notification.id);
    queryClient.invalidateQueries({ queryKey: ["notification-history-all"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    navigate("/dashboard?section=actions");
  };

  const toggleRead = async (notification: any) => {
    await supabase.from("notifications").update({ read: !notification.read }).eq("id", notification.id);
    queryClient.invalidateQueries({ queryKey: ["notification-history-all"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast.success(notification.read ? "Marked as unread" : "Marked as read");
  };

  const deleteNotification = async (notifId: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", notifId);
    if (error) { toast.error("Failed to delete: " + error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["notification-history-all"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("Notification deleted");
  };

  const markAllRead = async () => {
    const unreadIds = allNotifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    queryClient.invalidateQueries({ queryKey: ["notification-history-all"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("All notifications marked as read");
  };

  const deleteAll = async () => {
    if (!user) return;
    const { error } = await supabase.from("notifications").delete().eq("user_id", user.id);
    if (error) { toast.error("Failed to clear: " + error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["notification-history-all"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("All notifications deleted");
  };

  if (!user) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
            All ({totalCount})
          </Button>
          <Button variant={filter === "unread" ? "default" : "outline"} size="sm" onClick={() => setFilter("unread")}>
            Unread ({unreadCount})
          </Button>
          <Button variant={filter === "read" ? "default" : "outline"} size="sm" onClick={() => setFilter("read")}>
            Read ({readCount})
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
            Mark all read
          </Button>
          <Button variant="outline" size="sm" onClick={deleteAll} disabled={totalCount === 0}>
            Clear all
          </Button>
        </div>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : filteredNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    !notification.read ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className="flex-1 text-left space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{notification.title}</p>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      {notification.message && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{notification.message}</p>
                      )}
                      <div className="flex items-center gap-2 pt-0.5">
                        <Badge variant="outline" className="text-xs">
                          {TYPE_LABELS[notification.type] || notification.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </button>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); toggleRead(notification); }}
                        title={notification.read ? "Mark as unread" : "Mark as read"}
                      >
                        {notification.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
