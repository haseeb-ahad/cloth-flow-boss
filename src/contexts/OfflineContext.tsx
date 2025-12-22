// Context for managing offline sync state across the app
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { setupAutoSync, initialSync, isOnline } from '@/lib/syncService';
import { getPendingSyncCount } from '@/lib/offlineDb';
import { toast } from '@/hooks/use-toast';

interface OfflineContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  isInitialized: boolean;
  triggerSync: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(isOnline());
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { ownerId, user } = useAuth();

  // Initialize offline database and sync
  useEffect(() => {
    if (!ownerId || !user) return;

    let cleanup: (() => void) | undefined;

    const initialize = async () => {
      setIsSyncing(true);
      
      try {
        // Initial sync if online
        if (isOnline()) {
          await initialSync(ownerId);
          setLastSyncTime(new Date());
        }
        
        // Set up auto sync
        cleanup = setupAutoSync(ownerId, (result) => {
          setPendingCount(0);
          setLastSyncTime(new Date());
          setIsSyncing(false);
        });

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize offline sync:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    initialize();

    return () => {
      cleanup?.();
    };
  }, [ownerId, user]);

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      toast({
        title: "Back online",
        description: "Syncing your changes...",
      });
    };

    const handleOffline = () => {
      setOnline(false);
      toast({
        title: "You're offline",
        description: "Changes will sync when you're back online",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending count periodically
  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingSyncCount();
      setPendingCount(count);
    };

    updateCount();
    const interval = setInterval(updateCount, 5000);

    return () => clearInterval(interval);
  }, []);

  const triggerSync = useCallback(async () => {
    if (!ownerId || isSyncing || !online) return;

    setIsSyncing(true);
    try {
      await initialSync(ownerId);
      const count = await getPendingSyncCount();
      setPendingCount(count);
      setLastSyncTime(new Date());
      
      if (count === 0) {
        toast({
          title: "All data synced successfully",
          description: "Your data is up to date",
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: "Sync failed",
        description: "Will retry automatically",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [ownerId, isSyncing, online]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline: online,
        isSyncing,
        pendingCount,
        lastSyncTime,
        isInitialized,
        triggerSync,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
