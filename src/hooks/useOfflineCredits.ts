// Offline-first hook for credits management
import { useState, useEffect, useCallback } from 'react';
import * as offlineDb from '@/lib/offlineDb';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';

export interface Credit {
  id: string;
  customer_name: string;
  customer_phone?: string | null;
  amount: number;
  paid_amount?: number | null;
  remaining_amount: number;
  due_date?: string | null;
  sale_id?: string | null;
  status?: string | null;
  notes?: string | null;
  credit_type: string;
  person_type?: string | null;
  owner_id?: string | null;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export interface CreditTransaction {
  id: string;
  credit_id: string;
  customer_name: string;
  customer_phone?: string | null;
  amount: number;
  transaction_date: string;
  notes?: string | null;
  owner_id?: string | null;
  created_at?: string;
  is_deleted?: boolean;
}

export function useOfflineCredits() {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { ownerId, user } = useAuth();
  const { isOnline } = useOffline();

  const loadCredits = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const localData = await offlineDb.getAll<Credit>('credits');
      setCredits(localData);
      setIsLoading(false);

      if (isOnline) {
        try {
          const { data: serverData, error: fetchError } = await supabase
            .from('credits')
            .select('*')
            .order('created_at', { ascending: false });

          if (fetchError) throw fetchError;

          if (serverData) {
            await offlineDb.bulkPut('credits', serverData, 'synced');
            
            const pendingChanges = await offlineDb.getPendingSyncRecords<Credit>('credits');
            const pendingIds = new Set(pendingChanges.map(p => p.id));
            
            const mergedData = [
              ...serverData.filter(item => !pendingIds.has(item.id)),
              ...pendingChanges.filter(p => !p.is_deleted),
            ];
            
            setCredits(mergedData);
          }
        } catch (syncError) {
          console.warn('Failed to sync credits:', syncError);
        }
      }
    } catch (err) {
      console.error('Error loading credits:', err);
      setError(err as Error);
    }
  }, [user, isOnline]);

  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  useEffect(() => {
    const handleOnline = () => loadCredits();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [loadCredits]);

  const addCredit = useCallback(async (credit: Omit<Credit, 'id'>): Promise<Credit> => {
    const now = new Date().toISOString();
    const newCredit: Credit = {
      ...credit,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      owner_id: ownerId,
      is_deleted: false,
    };

    await offlineDb.put('credits', newCredit as any, 'pending', user?.id);
    setCredits(prev => [newCredit, ...prev]);

    if (isOnline) {
      try {
        const { sync_status, local_updated_at, ...dataToInsert } = newCredit as any;
        const { error } = await supabase.from('credits').insert(dataToInsert);
        if (!error) {
          await offlineDb.updateSyncStatus('credits', newCredit.id, 'synced');
        }
      } catch (err) {
        console.warn('Failed to sync credit:', err);
      }
    }

    return newCredit;
  }, [ownerId, user, isOnline]);

  const updateCredit = useCallback(async (id: string, updates: Partial<Credit>): Promise<Credit | null> => {
    const existing = await offlineDb.getById<Credit>('credits', id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: Credit = {
      ...existing,
      ...updates,
      updated_at: now,
    };

    await offlineDb.put('credits', updated as any, 'pending');
    setCredits(prev => prev.map(item => item.id === id ? updated : item));

    if (isOnline) {
      try {
        const { sync_status, local_updated_at, ...dataToUpdate } = updated as any;
        const { error } = await supabase.from('credits').update(dataToUpdate).eq('id', id);
        if (!error) {
          await offlineDb.updateSyncStatus('credits', id, 'synced');
        }
      } catch (err) {
        console.warn('Failed to sync credit update:', err);
      }
    }

    return updated;
  }, [isOnline]);

  const recordPayment = useCallback(async (
    creditId: string,
    paymentAmount: number,
    notes?: string
  ): Promise<CreditTransaction | null> => {
    const credit = await offlineDb.getById<Credit>('credits', creditId);
    if (!credit) return null;

    const now = new Date().toISOString();
    const transaction: CreditTransaction = {
      id: crypto.randomUUID(),
      credit_id: creditId,
      customer_name: credit.customer_name,
      customer_phone: credit.customer_phone,
      amount: paymentAmount,
      transaction_date: now.split('T')[0],
      notes: notes || null,
      owner_id: ownerId,
      created_at: now,
      is_deleted: false,
    };

    await offlineDb.put('credit_transactions', transaction as any, 'pending', user?.id);

    // Update credit record
    const newPaidAmount = (credit.paid_amount || 0) + paymentAmount;
    const newRemainingAmount = credit.remaining_amount - paymentAmount;
    await updateCredit(creditId, {
      paid_amount: newPaidAmount,
      remaining_amount: newRemainingAmount,
      status: newRemainingAmount <= 0 ? 'paid' : 'pending',
    });

    if (isOnline) {
      try {
        const { sync_status, local_updated_at, ...dataToInsert } = transaction as any;
        const { error } = await supabase.from('credit_transactions').insert(dataToInsert);
        if (!error) {
          await offlineDb.updateSyncStatus('credit_transactions', transaction.id, 'synced');
        }
      } catch (err) {
        console.warn('Failed to sync credit transaction:', err);
      }
    }

    return transaction;
  }, [ownerId, user, isOnline, updateCredit]);

  const getTotalOutstanding = useCallback((): number => {
    return credits
      .filter(c => c.remaining_amount > 0 && !c.is_deleted)
      .reduce((sum, c) => sum + c.remaining_amount, 0);
  }, [credits]);

  return {
    credits,
    isLoading,
    error,
    refetch: loadCredits,
    addCredit,
    updateCredit,
    recordPayment,
    getTotalOutstanding,
  };
}
