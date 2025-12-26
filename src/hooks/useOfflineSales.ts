// Offline-first hook for sales/invoices management
import { useState, useEffect, useCallback } from 'react';
import * as offlineDb from '@/lib/offlineDb';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';

export interface Sale {
  id: string;
  invoice_number: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  total_amount: number;
  discount?: number | null;
  final_amount: number;
  paid_amount?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  status?: string | null;
  description?: string | null;
  image_url?: string | null;
  owner_id?: string | null;
  created_at?: string;
  is_deleted?: boolean;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  purchase_price: number;
  total_price: number;
  profit: number;
  is_return?: boolean;
  is_deleted?: boolean;
}

export function useOfflineSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { ownerId, user } = useAuth();
  const { isOnline } = useOffline();

  const loadSales = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const localData = await offlineDb.getAll<Sale>('sales');
      setSales(localData);
      setIsLoading(false);

      if (isOnline) {
        try {
          const { data: serverData, error: fetchError } = await supabase
            .from('sales')
            .select('*')
            .order('created_at', { ascending: false });

          if (fetchError) throw fetchError;

          if (serverData) {
            await offlineDb.bulkPut('sales', serverData, 'synced');
            
            const pendingChanges = await offlineDb.getPendingSyncRecords<Sale>('sales');
            const pendingIds = new Set(pendingChanges.map(p => p.id));
            
            const mergedData = [
              ...serverData.filter(item => !pendingIds.has(item.id)),
              ...pendingChanges.filter(p => !p.is_deleted),
            ];
            
            setSales(mergedData);
          }
        } catch (syncError) {
          console.warn('Failed to sync sales:', syncError);
        }
      }
    } catch (err) {
      console.error('Error loading sales:', err);
      setError(err as Error);
    }
  }, [user, isOnline]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  useEffect(() => {
    const handleOnline = () => loadSales();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [loadSales]);

  const generateInvoiceNumber = async (): Promise<string> => {
    const now = new Date();
    const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, '');
    const localSales = await offlineDb.getAll<Sale>('sales');
    const todaySales = localSales.filter(s => s.invoice_number?.startsWith(`INV-${datePrefix}`));
    const nextNum = (todaySales.length + 1).toString().padStart(4, '0');
    return `INV-${datePrefix}-${nextNum}`;
  };

  const addSale = useCallback(async (
    sale: Omit<Sale, 'id' | 'invoice_number'>,
    items: Omit<SaleItem, 'id' | 'sale_id'>[]
  ): Promise<Sale> => {
    const now = new Date().toISOString();
    const invoiceNumber = await generateInvoiceNumber();
    
    const newSale: Sale = {
      ...sale,
      id: crypto.randomUUID(),
      invoice_number: invoiceNumber,
      created_at: now,
      owner_id: ownerId,
      is_deleted: false,
    };

    await offlineDb.put('sales', newSale as any, 'pending', user?.id);

    // Save sale items FIRST before updating state
    const savedItems: SaleItem[] = [];
    for (const item of items) {
      const saleItem: SaleItem = {
        ...item,
        id: crypto.randomUUID(),
        sale_id: newSale.id,
        is_deleted: false,
      };
      await offlineDb.put('sale_items', saleItem as any, 'pending', user?.id);
      savedItems.push(saleItem);
    }

    setSales(prev => [newSale, ...prev]);

    if (isOnline) {
      try {
        const { sync_status, local_updated_at, created_by, ...saleToInsert } = newSale as any;
        const { error: saleError } = await supabase.from('sales').insert(saleToInsert);
        
        if (!saleError) {
          await offlineDb.updateSyncStatus('sales', newSale.id, 'synced');
          
          // Sync sale items
          for (const item of savedItems) {
            const { sync_status: itemSyncStatus, local_updated_at: itemLocalUpdated, created_by: itemCreatedBy, ...itemToInsert } = item as any;
            const { error: itemError } = await supabase.from('sale_items').insert(itemToInsert);
            if (!itemError) {
              await offlineDb.updateSyncStatus('sale_items', item.id, 'synced');
            }
          }
        }
      } catch (err) {
        console.warn('Failed to sync sale:', err);
      }
    }

    return newSale;
  }, [ownerId, user, isOnline]);

  const updateSale = useCallback(async (id: string, updates: Partial<Sale>): Promise<Sale | null> => {
    const existing = await offlineDb.getById<Sale>('sales', id);
    if (!existing) return null;

    const updated: Sale = {
      ...existing,
      ...updates,
    };

    await offlineDb.put('sales', updated as any, 'pending');
    setSales(prev => prev.map(item => item.id === id ? updated : item));

    if (isOnline) {
      try {
        const { sync_status, local_updated_at, ...dataToUpdate } = updated as any;
        const { error } = await supabase.from('sales').update(dataToUpdate).eq('id', id);
        if (!error) {
          await offlineDb.updateSyncStatus('sales', id, 'synced');
        }
      } catch (err) {
        console.warn('Failed to sync sale update:', err);
      }
    }

    return updated;
  }, [isOnline]);

  const deleteSale = useCallback(async (id: string): Promise<void> => {
    // Remove from UI state immediately
    setSales(prev => prev.filter(item => item.id !== id));
    
    // Soft delete in offline DB
    await offlineDb.softDelete('sales', id);
    
    // Also soft delete related sale items
    const saleItems = await offlineDb.getByIndex<SaleItem>('sale_items', 'sale_id', id);
    for (const item of saleItems) {
      await offlineDb.softDelete('sale_items', item.id);
    }

    if (isOnline) {
      try {
        const now = new Date().toISOString();
        const { error: saleDeleteError } = await supabase
          .from('sales')
          .update({ is_deleted: true, deleted_at: now })
          .eq('id', id);
          
        if (!saleDeleteError) {
          await supabase
            .from('sale_items')
            .update({ is_deleted: true, deleted_at: now })
            .eq('sale_id', id);
          // Mark as synced after successful server delete
          await offlineDb.updateSyncStatus('sales', id, 'synced');
        }
      } catch (err) {
        console.warn('Failed to sync sale delete:', err);
      }
    }
  }, [isOnline]);

  const getSaleItems = useCallback(async (saleId: string): Promise<SaleItem[]> => {
    return await offlineDb.getByIndex<SaleItem>('sale_items', 'sale_id', saleId);
  }, []);

  return {
    sales,
    isLoading,
    error,
    refetch: loadSales,
    addSale,
    updateSale,
    deleteSale,
    getSaleItems,
    generateInvoiceNumber,
  };
}
