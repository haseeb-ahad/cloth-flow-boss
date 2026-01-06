import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export const useAdminPresence = () => {
  const { user, userRole } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isOnlineRef = useRef<boolean>(false);

  const updatePresence = useCallback(async (status: 'online' | 'offline') => {
    if (!user || userRole !== 'admin') return;

    try {
      const { error } = await supabase
        .from('admin_presence')
        .upsert({
          admin_id: user.id,
          status,
          last_seen: new Date().toISOString(),
        }, {
          onConflict: 'admin_id'
        });

      if (error) {
        console.error('Failed to update presence:', error);
        // Silent fail - don't show toast for every heartbeat failure
      } else {
        isOnlineRef.current = status === 'online';
      }
    } catch (err) {
      console.error('Presence update error:', err);
    }
  }, [user, userRole]);

  const sendHeartbeat = useCallback(async () => {
    if (!user || userRole !== 'admin') return;

    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;

    // If idle for more than 10 minutes, set offline
    if (timeSinceActivity > IDLE_TIMEOUT) {
      if (isOnlineRef.current) {
        await updatePresence('offline');
      }
      return;
    }

    // Send heartbeat
    await updatePresence('online');
  }, [user, userRole, updatePresence]);

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // If was offline due to idle, immediately go online
    if (!isOnlineRef.current && user && userRole === 'admin') {
      updatePresence('online');
    }
  }, [user, userRole, updatePresence]);

  useEffect(() => {
    if (!user || userRole !== 'admin') return;

    // Set online immediately
    updatePresence('online');

    // Track user activity
    const events = ['mousedown', 'keydown', 'mousemove', 'touchstart', 'scroll'];
    
    // Throttle activity handler to prevent too many calls
    let activityThrottleTimeout: NodeJS.Timeout | null = null;
    const throttledActivityHandler = () => {
      if (activityThrottleTimeout) return;
      activityThrottleTimeout = setTimeout(() => {
        handleActivity();
        activityThrottleTimeout = null;
      }, 1000);
    };

    events.forEach(event => {
      window.addEventListener(event, throttledActivityHandler, { passive: true });
    });

    // Start heartbeat interval
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Handle page visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleActivity();
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle page unload - set offline
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery on page unload
      const payload = JSON.stringify({
        admin_id: user.id,
        status: 'offline',
        last_seen: new Date().toISOString(),
      });
      
      navigator.sendBeacon?.(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-presence`,
        payload
      );
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, throttledActivityHandler);
      });
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      if (activityThrottleTimeout) {
        clearTimeout(activityThrottleTimeout);
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Set offline when component unmounts
      updatePresence('offline');
    };
  }, [user, userRole, updatePresence, handleActivity, sendHeartbeat]);

  return { isOnline: isOnlineRef.current };
};
