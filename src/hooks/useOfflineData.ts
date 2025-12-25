// Custom hook for offline-first data operations
import { useState, useEffect, useCallback } from 'react';
import * as offlineDb from '@/lib/offlineDb';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isOnline } from '@/lib/syncService';

interface UseOfflineDataOptions<T> {
  storeName: offlineDb.StoreName;
  tableName: string;
  fetchQuery?: () => Promise<{ data: T[] | null; error: any }>;
  enabled?: boolean;
}

interface UseOfflineDataResult<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  add: (item: T) => Promise<T>;
  update: (id: string, updates: Partial<T>) => Promise<T | null>;
  remove: (id: string) => Promise<void>;
}

export function useOfflineData<T extends { id: string }>({
  storeName,
  tableName,
  fetchQuery,
  enabled = true,
}: UseOfflineDataOptions<T>): UseOfflineDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { ownerId } = useAuth();

  // Load data from IndexedDB first, then sync with server
  const loadData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, load from IndexedDB (instant)
      const localData = await offlineDb.getAll<T>(storeName);
      setData(localData);
      setIsLoading(false);

      // Then, if online, fetch fresh data from server
      if (isOnline()) {
        try {
          let serverData: T[] | null = null;

          if (fetchQuery) {
            const result = await fetchQuery();
            if (result.error) throw result.error;
            serverData = result.data;
          } else {
            const { data: fetchedData, error: fetchError } = await (supabase
              .from(tableName as any)
              .select('*') as any);
            
            if (fetchError) throw fetchError;
            serverData = fetchedData as T[];
          }

          if (serverData) {
            // Update IndexedDB with server data
            await offlineDb.bulkPut(storeName, serverData as any[], 'synced');
            
            // Merge with any pending local changes
            const pendingChanges = await offlineDb.getPendingSyncRecords<T>(storeName);
            const pendingIds = new Set(pendingChanges.map(p => p.id));
            
            // Keep pending local changes, replace synced with server data
            const mergedData = [
              ...serverData.filter(item => !pendingIds.has(item.id)),
              ...pendingChanges.filter(p => !(p as any).is_deleted),
            ];
            
            setData(mergedData as T[]);
          }
        } catch (syncError) {
          console.warn('Failed to sync with server, using offline data:', syncError);
          // Keep using local data
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err as Error);
    }
  }, [storeName, tableName, fetchQuery, enabled, ownerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for online/offline events to refresh data
  useEffect(() => {
    const handleOnline = () => {
      loadData();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [loadData]);

  const add = useCallback(async (item: T): Promise<T> => {
    const now = new Date().toISOString();
    const newItem = {
      ...item,
      id: item.id || crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      owner_id: ownerId,
    } as T;

    // Save to IndexedDB first
    await offlineDb.put(storeName, newItem as any, 'pending');
    
    // Update local state immediately
    setData(prev => [...prev, newItem]);

    // If online, sync to server
    if (isOnline()) {
      try {
        const { sync_status, local_updated_at, ...dataToInsert } = newItem as any;
        const { error } = await (supabase.from(tableName as any).insert(dataToInsert) as any);
        
        if (!error) {
          await offlineDb.updateSyncStatus(storeName, newItem.id, 'synced');
        }
      } catch (err) {
        console.warn('Failed to sync new item, will retry later:', err);
      }
    }

    return newItem;
  }, [storeName, tableName, ownerId]);

  const update = useCallback(async (id: string, updates: Partial<T>): Promise<T | null> => {
    const existing = await offlineDb.getById<T>(storeName, id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated = {
      ...existing,
      ...updates,
      updated_at: now,
    } as T;

    // Save to IndexedDB first
    await offlineDb.put(storeName, updated as any, 'pending');
    
    // Update local state immediately
    setData(prev => prev.map(item => item.id === id ? updated : item));

    // If online, sync to server
    if (isOnline()) {
      try {
        const { sync_status, local_updated_at, ...dataToUpdate } = updated as any;
        const { error } = await (supabase.from(tableName as any).update(dataToUpdate).eq('id', id) as any);
        
        if (!error) {
          await offlineDb.updateSyncStatus(storeName, id, 'synced');
        }
      } catch (err) {
        console.warn('Failed to sync update, will retry later:', err);
      }
    }

    return updated;
  }, [storeName, tableName]);

  const remove = useCallback(async (id: string): Promise<void> => {
    // Soft delete in IndexedDB
    await offlineDb.softDelete(storeName, id);
    
    // Update local state immediately
    setData(prev => prev.filter(item => item.id !== id));

    // If online, sync to server
    if (isOnline()) {
      try {
        const { error } = await (supabase
          .from(tableName as any)
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq('id', id) as any);
        
        if (!error) {
          // Hard delete from IndexedDB after successful server sync
          await offlineDb.hardDelete(storeName, id);
        }
      } catch (err) {
        console.warn('Failed to sync delete, will retry later:', err);
      }
    }
  }, [storeName, tableName]);

  return {
    data,
    isLoading,
    error,
    refetch: loadData,
    add,
    update,
    remove,
  };
}

// Hook for localStorage preferences
export function useLocalPreference<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPreference = useCallback((newValue: T) => {
    setValue(newValue);
    try {
      localStorage.setItem(key, JSON.stringify(newValue));
    } catch (err) {
      console.error('Failed to save preference:', err);
    }
  }, [key]);

  return [value, setPreference];
}
