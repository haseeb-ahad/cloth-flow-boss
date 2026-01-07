import { useState, useEffect, useRef } from "react";
import { Bell, Check, X, AlertTriangle, CheckCircle2, Info, User, CreditCard, Shield, Volume2, VolumeX, MonitorSmartphone } from "lucide-react";
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

// Global audio context for mobile compatibility
let globalAudioContext: AudioContext | null = null;
let audioUnlocked = false;

const getAudioContext = () => {
  if (!globalAudioContext) {
    globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return globalAudioContext;
};

// Unlock audio for mobile - must be called on user interaction
const unlockAudio = async () => {
  if (audioUnlocked) return true;
  
  try {
    const audioContext = getAudioContext();
    
    // Resume if suspended (required for mobile)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Play a silent sound to unlock
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
    
    audioUnlocked = true;
    localStorage.setItem('audio_unlocked', 'true');
    return true;
  } catch (error) {
    console.log("Failed to unlock audio:", error);
    return false;
  }
};

// Sound using Web Audio API
const playNotificationSound = async (type: "normal" | "urgent") => {
  try {
    const audioContext = getAudioContext();
    
    // Try to resume if suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === "urgent") {
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(0, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else {
      oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    }
  } catch (error) {
    console.log("Audio not supported:", error);
  }
};

// Request browser notification permission
const requestNotificationPermission = async () => {
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
};

// Show desktop notification
const showDesktopNotification = (title: string, message: string, isUrgent: boolean) => {
  if ("Notification" in window && Notification.permission === "granted") {
    const notification = new Notification(title, {
      body: message,
      icon: "/favicon.ico",
      tag: "super-admin-notification",
      requireInteraction: isUrgent,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after 5 seconds for non-urgent
    if (!isUrgent) {
      setTimeout(() => notification.close(), 5000);
    }
  }
};

const SuperAdminNotificationBell = ({ superAdminUserId }: SuperAdminNotificationBellProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('superadmin_sound_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [desktopEnabled, setDesktopEnabled] = useState(() => {
    const saved = localStorage.getItem('superadmin_desktop_enabled');
    return saved !== null ? saved === 'true' : false;
  });
  const [showActivationBanner, setShowActivationBanner] = useState(false);
  const previousCountRef = useRef(0);
  const soundEnabledRef = useRef(soundEnabled);
  const desktopEnabledRef = useRef(desktopEnabled);

  // Keep refs in sync with state and persist to localStorage
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    localStorage.setItem('superadmin_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    desktopEnabledRef.current = desktopEnabled;
    localStorage.setItem('superadmin_desktop_enabled', String(desktopEnabled));
  }, [desktopEnabled]);

  useEffect(() => {
    if (!superAdminUserId) return;
    
    // Check if audio needs to be unlocked on mobile
    const wasUnlocked = localStorage.getItem('audio_unlocked') === 'true';
    if (!wasUnlocked && soundEnabled) {
      setShowActivationBanner(true);
    }
    
    // Check and request notification permission
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        setDesktopEnabled(prev => prev || localStorage.getItem('superadmin_desktop_enabled') === 'true');
      } else if (Notification.permission === "default") {
        requestNotificationPermission().then(() => {
          if (Notification.permission === "granted") {
            setDesktopEnabled(true);
          }
        });
      }
    }
    
    fetchNotifications();

    // Poll for new notifications every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [superAdminUserId]);

  // Handle bell click to unlock audio
  const handleBellClick = async () => {
    if (!audioUnlocked) {
      await unlockAudio();
      setShowActivationBanner(false);
    }
    setIsOpen(!isOpen);
  };

  const toggleDesktopNotifications = async () => {
    if (!("Notification" in window)) return;
    
    if (Notification.permission === "granted") {
      setDesktopEnabled(!desktopEnabled);
    } else if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      setDesktopEnabled(permission === "granted");
    }
  };

  const fetchNotifications = async () => {
    if (!superAdminUserId) return;
    
    try {
      const { data, error } = await supabase.functions.invoke("super-admin", {
        body: { 
          action: "get_super_admin_notifications", 
          data: { super_admin_id: superAdminUserId } 
        }
      });

      if (!error && data?.notifications) {
        const notifs = data.notifications as Notification[];
        setNotifications(notifs);
        const newUnreadCount = notifs.filter((n) => !n.is_read).length;
        
        // Play sound and show desktop notification if there are new unread notifications
        if (newUnreadCount > previousCountRef.current && previousCountRef.current >= 0) {
          const latestNotif = notifs[0];
          if (latestNotif && !latestNotif.is_read) {
            const isUrgent = latestNotif.type === "high_priority" || latestNotif.category === "duplicate_attempt";
            
            if (soundEnabledRef.current) {
              playNotificationSound(isUrgent ? "urgent" : "normal");
            }
            
            if (desktopEnabledRef.current) {
              showDesktopNotification(latestNotif.title, latestNotif.message, isUrgent);
            }
          }
        }
        previousCountRef.current = newUnreadCount;
        setUnreadCount(newUnreadCount);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase.functions.invoke("super-admin", {
        body: { 
          action: "mark_notification_read", 
          data: { notification_id: notificationId } 
        }
      });
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!superAdminUserId) return;
    
    try {
      await supabase.functions.invoke("super-admin", {
        body: { 
          action: "mark_all_notifications_read", 
          data: { super_admin_id: superAdminUserId } 
        }
      });
      
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase.functions.invoke("super-admin", {
        body: { 
          action: "delete_notification", 
          data: { notification_id: notificationId } 
        }
      });
      
      const wasUnread = notifications.find(n => n.id === notificationId)?.is_read === false;
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
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
    <>
      {/* Mobile activation banner */}
      {showActivationBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-center text-sm md:hidden">
          <button 
            onClick={async () => {
              await unlockAudio();
              setShowActivationBanner(false);
            }}
            className="underline font-medium"
          >
            Tap here to enable notification sounds
          </button>
        </div>
      )}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="relative h-9 w-9 p-0 hover:bg-slate-100"
            onClick={handleBellClick}
          >
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 w-7 p-0 hover:bg-white/10",
                desktopEnabled ? "text-white" : "text-white/50"
              )}
              onClick={toggleDesktopNotifications}
              title={desktopEnabled ? "Desktop alerts on" : "Desktop alerts off"}
            >
              <MonitorSmartphone className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
            >
              {soundEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
            </Button>
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
        </div>

        <ScrollArea className="h-[350px] sm:h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No notifications yet</p>
              <p className="text-xs text-slate-400 mt-1">New admin registrations will appear here</p>
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
    </>
  );
};

export default SuperAdminNotificationBell;