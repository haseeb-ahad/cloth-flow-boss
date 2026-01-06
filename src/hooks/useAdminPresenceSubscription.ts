import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminPresence {
  admin_id: string;
  status: string;
  last_seen: string;
}

export const useAdminPresenceSubscription = () => {
  const [presenceMap, setPresenceMap] = useState<Map<string, AdminPresence>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllPresence = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_presence')
        .select('*');

      if (error) throw error;

      const map = new Map<string, AdminPresence>();
      (data || []).forEach((p: AdminPresence) => {
        map.set(p.admin_id, p);
      });
      setPresenceMap(map);
    } catch (err) {
      console.error('Error fetching presence:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllPresence();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('admin-presence-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_presence'
        },
        (payload) => {
          const newRecord = payload.new as AdminPresence;
          const oldRecord = payload.old as AdminPresence;

          setPresenceMap(prev => {
            const updated = new Map(prev);
            
            if (payload.eventType === 'DELETE' && oldRecord) {
              updated.delete(oldRecord.admin_id);
            } else if (newRecord) {
              updated.set(newRecord.admin_id, newRecord);
            }
            
            return updated;
          });
        }
      )
      .subscribe();

    // Check for stale sessions periodically (every minute)
    const staleCheckInterval = setInterval(async () => {
      try {
        await supabase.functions.invoke('admin-presence', {
          body: { action: 'check_offline' }
        });
      } catch (err) {
        console.error('Error checking stale sessions:', err);
      }
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(staleCheckInterval);
    };
  }, [fetchAllPresence]);

  const getPresence = useCallback((adminId: string): AdminPresence | undefined => {
    return presenceMap.get(adminId);
  }, [presenceMap]);

  const isOnline = useCallback((adminId: string): boolean => {
    const presence = presenceMap.get(adminId);
    if (!presence) return false;
    
    // Double check: if last_seen is more than 10 minutes ago, consider offline
    const lastSeen = new Date(presence.last_seen);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    return presence.status === 'online' && lastSeen > tenMinutesAgo;
  }, [presenceMap]);

  return { presenceMap, getPresence, isOnline, isLoading, refetch: fetchAllPresence };
};
