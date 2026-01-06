import { useState, useEffect } from "react";
import { Bell, Check, X, AlertTriangle, CheckCircle2, Info, User, CreditCard, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

interface SuperAdminNotificationBellProps {
  superAdminUserId: string;
}

const SuperAdminNotificationBell = ({ superAdminUserId }: SuperAdminNotificationBellProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!superAdminUserId) return;
    
    fetchNotifications();

    // Real-time subscription
    const channel = supabase
      .channel('superadmin-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${superAdminUserId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [superAdminUserId]);

  const fetchNotifications = async () => {
    if (!superAdminUserId) return;
    
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", superAdminUserId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);
    
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!superAdminUserId) return;
    
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", superAdminUserId)
      .eq("is_read", false);
    
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);
    
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const getIcon = (type: string, category: string) => {
    if (type === "high_priority" || category === "duplicate_attempt") {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (type === "success" || category === "payment_approved") {
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
    if (category === "registration") {
      return <User className="h-4 w-4 text-blue-500" />;
    }
    if (category === "payment_upload" || category === "payment_rejected") {
      return <CreditCard className="h-4 w-4 text-amber-500" />;
    }
    return <Info className="h-4 w-4 text-slate-500" />;
  };

  const getBgColor = (type: string, category: string, isRead: boolean) => {
    if (isRead) return "bg-slate-50";
    if (type === "high_priority" || category === "duplicate_attempt") {
      return "bg-red-50 border-l-4 border-l-red-500";
    }
    if (type === "success") {
      return "bg-emerald-50 border-l-4 border-l-emerald-500";
    }
    return "bg-blue-50 border-l-4 border-l-blue-500";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0 hover:bg-slate-100">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 sm:w-96 p-0" 
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="font-semibold text-sm">Admin Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-white/80 hover:text-white hover:bg-white/10"
              onClick={markAllAsRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[350px] sm:h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 transition-colors hover:bg-slate-100 cursor-pointer group",
                    getBgColor(notification.type, notification.category, notification.is_read)
                  )}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.type, notification.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-sm truncate",
                          !notification.is_read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      {notification.metadata?.admin_email && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Admin: {notification.metadata.admin_email}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default SuperAdminNotificationBell;