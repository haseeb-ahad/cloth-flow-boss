// Offline-first hook for products/inventory management with robust delete system
import { useState, useEffect, useCallback } from 'react';
import * as offlineDb from '@/lib/offlineDb';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import { softDeleteRecord, undoDelete, canUndoDelete, DeletedRecord } from '@/lib/deleteManager';
import { toast } from '@/hooks/use-toast';

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  quantity_type?: string | null;
  owner_id?: string | null;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export function useOfflineProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDeleted, setLastDeleted] = useState<DeletedRecord | null>(null);
  const { ownerId, user } = useAuth();
  const { isOnline } = useOffline();

  const loadProducts = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load from IndexedDB first (instant)
      const localData = await offlineDb.getAll<Product>('products');
      setProducts(localData);
      setIsLoading(false);

      // If online, sync with server
      if (isOnline) {
        try {
          const { data: serverData, error: fetchError } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

          if (fetchError) throw fetchError;

          if (serverData) {
            // Save to IndexedDB
            await offlineDb.bulkPut('products', serverData, 'synced');
            
            // Merge with pending local changes
            const pendingChanges = await offlineDb.getPendingSyncRecords<Product>('products');
            const pendingIds = new Set(pendingChanges.map(p => p.id));
            
            const mergedData = [
              ...serverData.filter(item => !pendingIds.has(item.id)),
              ...pendingChanges.filter(p => !p.is_deleted),
            ];
            
            setProducts(mergedData);
          }
        } catch (syncError) {
          console.warn('Failed to sync products with server:', syncError);
        }
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setError(err as Error);
    }
  }, [user, isOnline]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Listen for online events to resync
  useEffect(() => {
    const handleOnline = () => loadProducts();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [loadProducts]);

  const addProduct = useCallback(async (product: Omit<Product, 'id'>): Promise<Product> => {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...product,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      owner_id: ownerId,
      is_deleted: false,
    };

    await offlineDb.put('products', newProduct as any, 'pending', user?.id);
    setProducts(prev => [newProduct, ...prev]);

    if (isOnline) {
      try {
        const { sync_status, local_updated_at, ...dataToInsert } = newProduct as any;
        const { error } = await supabase.from('products').insert(dataToInsert);
        if (!error) {
          await offlineDb.updateSyncStatus('products', newProduct.id, 'synced');
        }
      } catch (err) {
        console.warn('Failed to sync new product:', err);
      }
    }

    return newProduct;
  }, [ownerId, user, isOnline]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>): Promise<Product | null> => {
    const existing = await offlineDb.getById<Product>('products', id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: Product = {
      ...existing,
      ...updates,
      updated_at: now,
    };

    await offlineDb.put('products', updated as any, 'pending');
    setProducts(prev => prev.map(item => item.id === id ? updated : item));

    if (isOnline) {
      try {
        const { sync_status, local_updated_at, ...dataToUpdate } = updated as any;
        const { error } = await supabase.from('products').update(dataToUpdate).eq('id', id);
        if (!error) {
          await offlineDb.updateSyncStatus('products', id, 'synced');
        }
      } catch (err) {
        console.warn('Failed to sync product update:', err);
      }
    }

    return updated;
  }, [isOnline]);

  const deleteProduct = useCallback(async (id: string): Promise<DeletedRecord> => {
    setProducts(prev => prev.filter(item => item.id !== id));

    try {
      const deletedRecord = await softDeleteRecord('products', id, isOnline);
      setLastDeleted(deletedRecord);
      
      toast({
        title: "Product deleted",
        description: "Refresh to undo within 30 seconds if needed.",
      });
      
      return deletedRecord;
    } catch (err: any) {
      loadProducts();
      throw err;
    }
  }, [isOnline, loadProducts]);

  const undoLastDelete = useCallback(async (): Promise<boolean> => {
    if (!lastDeleted || !canUndoDelete(lastDeleted.id)) {
      return false;
    }

    const result = await undoDelete(lastDeleted.id, isOnline);
    if (result.success) {
      setLastDeleted(null);
      await loadProducts();
      return true;
    }
    return false;
  }, [lastDeleted, isOnline, loadProducts]);

  // Update stock quantity (for invoice creation/updates)
  const updateStock = useCallback(async (id: string, quantityChange: number): Promise<void> => {
    const existing = await offlineDb.getById<Product>('products', id);
    if (!existing) return;

    const newQuantity = existing.stock_quantity + quantityChange;
    await updateProduct(id, { stock_quantity: newQuantity });
  }, [updateProduct]);

  return {
    products,
    isLoading,
    error,
    refetch: loadProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    lastDeleted,
    undoLastDelete,
    canUndo: lastDeleted ? canUndoDelete(lastDeleted.id) : false,
  };
}