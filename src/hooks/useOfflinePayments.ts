// Offline-first hook for payment ledger management
import { useState, useEffect, useCallback } from 'react';
import * as offlineDb from '@/lib/offlineDb';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';

export interface PaymentLedger {
  id: string;
  customer_name: string;
  customer_phone?: string | null;
  payment_amount: number;
  payment_date: string;
  details: any;
  description?: string | null;
  notes?: string | null;
  image_url?: string | null;
  owner_id?: string | null;
  created_at?: string;
  is_deleted?: boolean;
}

export function useOfflinePayments() {
  const [payments, setPayments] = useState<PaymentLedger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { ownerId, user } = useAuth();
  const { isOnline } = useOffline();

  const loadPayments = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const localData = await offlineDb.getAll<PaymentLedger>('payment_ledger');
      setPayments(localData);
      setIsLoading(false);

      if (isOnline) {
        try {
          const { data: serverData, error: fetchError } = await supabase
            .from('payment_ledger')
            .select('*')
            .order('payment_date', { ascending: false });

          if (fetchError) throw fetchError;

          if (serverData) {
            await offlineDb.bulkPut('payment_ledger', serverData, 'synced');
            
            const pendingChanges = await offlineDb.getPendingSyncRecords<PaymentLedger>('payment_ledger');
            const pendingIds = new Set(pendingChanges.map(p => p.id));
            
            const mergedData = [
              ...serverData.filter(item => !pendingIds.has(item.id)),
              ...pendingChanges.filter(p => !p.is_deleted),
            ];
            
            setPayments(mergedData);
          }
        } catch (syncError) {
          console.warn('Failed to sync payments:', syncError);
        }
      }
    } catch (err) {
      console.error('Error loading payments:', err);
      setError(err as Error);
    }
  }, [user, isOnline]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    const handleOnline = () => loadPayments();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [loadPayments]);

  const addPayment = useCallback(async (payment: Omit<PaymentLedger, 'id'>): Promise<PaymentLedger> => {
    const now = new Date().toISOString();
    const newPayment: PaymentLedger = {
      ...payment,
      id: crypto.randomUUID(),
      created_at: now,
      owner_id: ownerId,
      is_deleted: false,
    };

    await offlineDb.put('payment_ledger', newPayment as any, 'pending', user?.id);
    setPayments(prev => [newPayment, ...prev]);

    if (isOnline) {
      try {
        const { sync_status, local_updated_at, ...dataToInsert } = newPayment as any;
        const { error } = await supabase.from('payment_ledger').insert(dataToInsert);
        if (!error) {
          await offlineDb.updateSyncStatus('payment_ledger', newPayment.id, 'synced');
        }
      } catch (err) {
        console.warn('Failed to sync payment:', err);
      }
    }

    return newPayment;
  }, [ownerId, user, isOnline]);

  const updatePayment = useCallback(async (id: string, updates: Partial<PaymentLedger>): Promise<PaymentLedger | null> => {
    const existing = await offlineDb.getById<PaymentLedger>('payment_ledger', id);
    if (!existing) return null;

    const updated: PaymentLedger = {
      ...existing,
      ...updates,
    };

    await offlineDb.put('payment_ledger', updated as any, 'pending');
    setPayments(prev => prev.map(item => item.id === id ? updated : item));

    if (isOnline) {
      try {
        const { sync_status, local_updated_at, ...dataToUpdate } = updated as any;
        const { error } = await supabase.from('payment_ledger').update(dataToUpdate).eq('id', id);
        if (!error) {
          await offlineDb.updateSyncStatus('payment_ledger', id, 'synced');
        }
      } catch (err) {
        console.warn('Failed to sync payment update:', err);
      }
    }

    return updated;
  }, [isOnline]);

  const deletePayment = useCallback(async (id: string): Promise<void> => {
    await offlineDb.softDelete('payment_ledger', id);
    setPayments(prev => prev.filter(item => item.id !== id));

    if (isOnline) {
      try {
        const { error } = await supabase
          .from('payment_ledger')
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq('id', id);
        if (!error) {
          await offlineDb.hardDelete('payment_ledger', id);
        }
      } catch (err) {
        console.warn('Failed to sync payment delete:', err);
      }
    }
  }, [isOnline]);

  const getTotalPaymentsReceived = useCallback((startDate?: Date, endDate?: Date): number => {
    return payments
      .filter(p => {
        if (!startDate && !endDate) return true;
        const paymentDate = new Date(p.payment_date);
        if (startDate && paymentDate < startDate) return false;
        if (endDate && paymentDate > endDate) return false;
        return true;
      })
      .reduce((sum, p) => sum + p.payment_amount, 0);
  }, [payments]);

  return {
    payments,
    isLoading,
    error,
    refetch: loadPayments,
    addPayment,
    updatePayment,
    deletePayment,
    getTotalPaymentsReceived,
  };
}
