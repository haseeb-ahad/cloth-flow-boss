// Offline-first hook for expenses management with robust delete system
import { useState, useEffect, useCallback } from 'react';
import * as offlineDb from '@/lib/offlineDb';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import { softDeleteRecord, undoDelete, canUndoDelete, DeletedRecord } from '@/lib/deleteManager';
import { toast } from '@/hooks/use-toast';

export interface Expense {
  id: string;
  expense_type: string;
  amount: number;
  expense_date: string;
  description?: string | null;
  owner_id: string;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export function useOfflineExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDeleted, setLastDeleted] = useState<DeletedRecord | null>(null);
  const { ownerId, user } = useAuth();
  const { isOnline } = useOffline();

  const loadExpenses = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const localData = await offlineDb.getAll<Expense>('expenses');
      setExpenses(localData);
      setIsLoading(false);

      if (isOnline) {
        try {
          const { data: serverData, error: fetchError } = await supabase
            .from('expenses')
            .select('*')
            .order('expense_date', { ascending: false });

          if (fetchError) throw fetchError;

          if (serverData) {
            await offlineDb.bulkPut('expenses', serverData, 'synced');
            
            const pendingChanges = await offlineDb.getPendingSyncRecords<Expense>('expenses');
            const pendingIds = new Set(pendingChanges.map(p => p.id));
            
            const mergedData = [
              ...serverData.filter(item => !pendingIds.has(item.id)),
              ...pendingChanges.filter(p => !p.is_deleted),
            ];
            
            setExpenses(mergedData);
          }
        } catch (syncError) {
          console.warn('Failed to sync expenses:', syncError);
        }
      }
    } catch (err) {
      console.error('Error loading expenses:', err);
      setError(err as Error);
    }
  }, [user, isOnline]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    const handleOnline = () => loadExpenses();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [loadExpenses]);

  const addExpense = useCallback(async (expense: Omit<Expense, 'id'>): Promise<Expense> => {
    const now = new Date().toISOString();
    const newExpense: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      owner_id: ownerId!,
      is_deleted: false,
    };

    await offlineDb.put('expenses', newExpense as any, 'pending', user?.id);
    setExpenses(prev => [newExpense, ...prev]);

    if (isOnline) {
      try {
        const { sync_status, local_updated_at, ...dataToInsert } = newExpense as any;
        const { error } = await supabase.from('expenses').insert(dataToInsert);
        if (!error) {
          await offlineDb.updateSyncStatus('expenses', newExpense.id, 'synced');
        }
      } catch (err) {
        console.warn('Failed to sync expense:', err);
      }
    }

    return newExpense;
  }, [ownerId, user, isOnline]);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>): Promise<Expense | null> => {
    const existing = await offlineDb.getById<Expense>('expenses', id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: Expense = {
      ...existing,
      ...updates,
      updated_at: now,
    };

    await offlineDb.put('expenses', updated as any, 'pending');
    setExpenses(prev => prev.map(item => item.id === id ? updated : item));

    if (isOnline) {
      try {
        const { sync_status, local_updated_at, ...dataToUpdate } = updated as any;
        const { error } = await supabase.from('expenses').update(dataToUpdate).eq('id', id);
        if (!error) {
          await offlineDb.updateSyncStatus('expenses', id, 'synced');
        }
      } catch (err) {
        console.warn('Failed to sync expense update:', err);
      }
    }

    return updated;
  }, [isOnline]);

  const deleteExpense = useCallback(async (id: string): Promise<DeletedRecord> => {
    setExpenses(prev => prev.filter(item => item.id !== id));

    try {
      const deletedRecord = await softDeleteRecord('expenses', id, isOnline);
      setLastDeleted(deletedRecord);
      
      toast({
        title: "Expense deleted",
        description: "Refresh to undo within 30 seconds if needed.",
      });
      
      return deletedRecord;
    } catch (err: any) {
      loadExpenses();
      throw err;
    }
  }, [isOnline, loadExpenses]);

  const undoLastDelete = useCallback(async (): Promise<boolean> => {
    if (!lastDeleted || !canUndoDelete(lastDeleted.id)) {
      return false;
    }

    const result = await undoDelete(lastDeleted.id, isOnline);
    if (result.success) {
      setLastDeleted(null);
      await loadExpenses();
      return true;
    }
    return false;
  }, [lastDeleted, isOnline, loadExpenses]);

  const getTotalExpenses = useCallback((startDate?: Date, endDate?: Date): number => {
    return expenses
      .filter(e => {
        if (!startDate && !endDate) return true;
        const expenseDate = new Date(e.expense_date);
        if (startDate && expenseDate < startDate) return false;
        if (endDate && expenseDate > endDate) return false;
        return true;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  return {
    expenses,
    isLoading,
    error,
    refetch: loadExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    getTotalExpenses,
    lastDeleted,
    undoLastDelete,
    canUndo: lastDeleted ? canUndoDelete(lastDeleted.id) : false,
  };
}