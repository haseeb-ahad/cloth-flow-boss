import { useState, useEffect, useCallback } from 'react';
import { getPendingSyncCount } from '@/lib/offlineDb';
import { fullSync, isOnline as checkOnline } from '@/lib/syncService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface OfflineStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  triggerSync: () => Promise<void>;
}

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState(checkOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { user, ownerId } = useAuth();

  // Update online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending count periodically
  useEffect(() => {
    const updatePendingCount = async () => {
      try {
        const count = await getPendingSyncCount();
        setPendingCount(count);
      } catch (error) {
        console.error('Error getting pending count:', error);
      }
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);

    return () => clearInterval(interval);
  }, []);

  // Auto sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing && ownerId) {
      triggerSync();
    }
  }, [isOnline, pendingCount, ownerId]);

  const triggerSync = useCallback(async () => {
    if (!ownerId || isSyncing || !isOnline) return;

    setIsSyncing(true);
    try {
      const result = await fullSync(ownerId);
      setLastSyncTime(new Date());
      
      const newCount = await getPendingSyncCount();
      setPendingCount(newCount);

      if (result.synced > 0) {
        toast({
          title: "All data synced successfully",
          description: `${result.synced} records synchronized`,
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: "Sync failed",
        description: "Some changes couldn't be synced. Will retry later.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [ownerId, isSyncing, isOnline]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncTime,
    triggerSync,
  };
}
