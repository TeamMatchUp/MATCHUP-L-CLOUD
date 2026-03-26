import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notification-history", user?.id, filter],
    queryFn: async () => {
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (filter === "unread") query = query.eq("read", false);
      else if (filter === "read") query = query.eq("read", true);
      const { data } = await query;
      return data ?? [];
    },
    enabled: !!user,
  });

  const handleNotificationClick = async (notification: any) => {
    await supabase.from("notifications").update({ read: true }).eq("id", notification.id);
    queryClient.invalidateQueries({ queryKey: ["notification-history"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    navigate("/dashboard?section=actions");
  };

  const toggleRead = async (notification: any) => {
    await supabase.from("notifications").update({ read: !notification.read }).eq("id", notification.id);
    queryClient.invalidateQueries({ queryKey: ["notification-history"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast.success(notification.read ? "Marked as unread" : "Marked as read");
  };

  const deleteNotification = async (notifId: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", notifId);
    if (error) { toast.error("Failed to delete: " + error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["notification-history"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("Notification deleted");
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    queryClient.invalidateQueries({ queryKey: ["notification-history"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("All notifications marked as read");
  };

  const deleteAll = async () => {
    const ids = notifications.map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").delete().in("id", ids);
    queryClient.invalidateQueries({ queryKey: ["notification-history"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("All notifications deleted");
  };

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-lg font-normal text-foreground">Notifications</h3>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
              Mark all read
            </Button>
            <Button variant="outline" size="sm" onClick={deleteAll} disabled={notifications.length === 0}>
              Clear all
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
            All ({notifications.length})
          </Button>
          <Button variant={filter === "unread" ? "default" : "outline"} size="sm" onClick={() => setFilter("unread")}>
            Unread ({unreadCount})
          </Button>
          <Button variant={filter === "read" ? "default" : "outline"} size="sm" onClick={() => setFilter("read")}>
            Read ({notifications.length - unreadCount})
          </Button>
        </div>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
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
