// Sync service for offline-first data synchronization
import { supabase } from '@/integrations/supabase/client';
import * as offlineDb from './offlineDb';
import { toast } from '@/hooks/use-toast';

type TableName = 'products' | 'sales' | 'sale_items' | 'credits' | 'credit_transactions' | 
                 'expenses' | 'payment_ledger' | 'installments' | 'installment_payments' | 'app_settings';

export interface SyncResult {
  success: boolean;
  synced: number;
  errors: number;
  conflicts: number;
}

// Map store names to Supabase table names
const storeToTable: Record<offlineDb.StoreName, TableName | null> = {
  products: 'products',
  sales: 'sales',
  sale_items: 'sale_items',
  credits: 'credits',
  credit_transactions: 'credit_transactions',
  expenses: 'expenses',
  payment_ledger: 'payment_ledger',
  installments: 'installments',
  installment_payments: 'installment_payments',
  app_settings: 'app_settings',
  customers: null, // Derived from credits/sales, not a real table
  workers: null, // Handled separately via profiles/user_roles
  sync_queue: null,
  sync_logs: null,
};

// Check if we're online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Fetch all data from server and store in IndexedDB
export async function initialSync(ownerId: string): Promise<void> {
  if (!isOnline()) {
    console.log('Offline - skipping initial sync');
    return;
  }

  try {
    console.log('Starting initial sync...');
    
    // Sync each table
    await Promise.all([
      syncTableFromServer('products', ownerId),
      syncTableFromServer('sales', ownerId),
      syncTableFromServer('credits', ownerId),
      syncTableFromServer('expenses', ownerId),
      syncTableFromServer('payment_ledger', ownerId),
      syncTableFromServer('installments', ownerId),
      syncTableFromServer('app_settings', ownerId),
    ]);

    // Sync related tables
    const sales = await offlineDb.getAll<offlineDb.OfflineSale>('sales');
    for (const sale of sales) {
      await syncSaleItemsFromServer(sale.id);
    }

    const credits = await offlineDb.getAll<offlineDb.OfflineCredit>('credits');
    for (const credit of credits) {
      await syncCreditTransactionsFromServer(credit.id);
    }

    const installments = await offlineDb.getAll<offlineDb.OfflineInstallment>('installments');
    for (const installment of installments) {
      await syncInstallmentPaymentsFromServer(installment.id);
    }

    // Save last sync time
    offlineDb.setLocalStorage(offlineDb.localStorageKeys.lastSyncTime, new Date().toISOString());

    console.log('Initial sync completed');
  } catch (error) {
    console.error('Initial sync failed:', error);
    throw error;
  }
}

async function syncTableFromServer(tableName: TableName, ownerId: string): Promise<void> {
  try {
    const { data, error } = tableName === 'app_settings'
      ? await supabase.from(tableName).select('*').eq('owner_id', ownerId)
      : await supabase.from(tableName).select('*');

    if (error) {
      console.error(`Error fetching ${tableName}:`, error);
      return;
    }

    if (data && data.length > 0) {
      await offlineDb.bulkPut(tableName as offlineDb.StoreName, data as any[], 'synced');
    }
  } catch (error) {
    console.error(`Error syncing ${tableName}:`, error);
  }
}

async function syncSaleItemsFromServer(saleId: string): Promise<void> {
  const { data, error } = await supabase
    .from('sale_items')
    .select('*')
    .eq('sale_id', saleId);

  if (!error && data) {
    await offlineDb.bulkPut('sale_items', data, 'synced');
  }
}

async function syncCreditTransactionsFromServer(creditId: string): Promise<void> {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('credit_id', creditId);

  if (!error && data) {
    await offlineDb.bulkPut('credit_transactions', data, 'synced');
  }
}

async function syncInstallmentPaymentsFromServer(installmentId: string): Promise<void> {
  const { data, error } = await supabase
    .from('installment_payments')
    .select('*')
    .eq('installment_id', installmentId);

  if (!error && data) {
    await offlineDb.bulkPut('installment_payments', data, 'synced');
  }
}

// Clear stuck error records that are already synced on server
async function clearSyncedErrorRecords(storeName: offlineDb.StoreName, tableName: TableName): Promise<void> {
  const errorRecords = await getErrorSyncRecords<offlineDb.OfflineRecord>(storeName);
  
  for (const record of errorRecords) {
    try {
      // Check if record exists on server
      const { data: serverRecord } = await supabase
        .from(tableName)
        .select('id, updated_at')
        .eq('id', record.id)
        .maybeSingle();
      
      if (serverRecord) {
        // Record exists on server, mark as synced locally
        await offlineDb.updateSyncStatus(storeName, record.id, 'synced');
      } else if (record.is_deleted) {
        // Deleted record that doesn't exist on server - remove locally
        await offlineDb.hardDelete(storeName, record.id);
      }
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
}

// Push pending changes to server
export async function syncToServer(): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, errors: 0, conflicts: 0 };

  if (!isOnline()) {
    return { ...result, success: false };
  }

  const stores: offlineDb.StoreName[] = [
    'products', 'sales', 'sale_items', 'credits', 'credit_transactions',
    'expenses', 'payment_ledger', 'installments', 'installment_payments', 'app_settings'
  ];

  for (const storeName of stores) {
    const tableName = storeToTable[storeName];
    if (!tableName) continue;

    try {
      // First, clear any stuck error records that are already synced
      await clearSyncedErrorRecords(storeName, tableName);
      
      // Get pending records only (error records were cleaned above)
      const pending = await offlineDb.getPendingSyncRecords<offlineDb.OfflineRecord>(storeName);
      
      for (const record of pending) {
        try {
          const syncResult = await syncRecord(tableName, record, storeName);
          if (syncResult.synced) {
            result.synced++;
            await offlineDb.updateSyncStatus(storeName, record.id, 'synced');
          }
          if (syncResult.conflict) {
            result.conflicts++;
          }
          if (syncResult.error) {
            result.errors++;
          }
        } catch (error) {
          console.error(`Error syncing record ${record.id}:`, error);
          result.errors++;
        }
      }
    } catch (storeError) {
      console.error(`Error processing store ${storeName}:`, storeError);
    }
  }

  result.success = result.errors === 0;
  return result;
}

// Get records with error sync status for retry
async function getErrorSyncRecords<T>(storeName: offlineDb.StoreName): Promise<T[]> {
  const db = await offlineDb.getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index('sync_status');
    const request = index.getAll('error');

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Clean record by removing local-only fields
function cleanRecordForSync(record: any, tableName: TableName): any {
  // Remove local-only fields
  const { 
    sync_status, 
    local_updated_at, 
    created_by,
    low_stock_alert, // Not in DB schema
    ...rest 
  } = record;
  
  return rest;
}

async function syncRecord(
  tableName: TableName, 
  localRecord: offlineDb.OfflineRecord,
  storeName: offlineDb.StoreName
): Promise<{ synced: boolean; conflict: boolean; error: boolean }> {
  const result = { synced: false, conflict: false, error: false };

  try {
    // Get server record
    const { data: serverRecord, error: fetchError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', localRecord.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching server record:', fetchError);
      // Network error - don't mark as error, will retry
      if (fetchError.message?.includes('fetch') || fetchError.message?.includes('network')) {
        return result;
      }
      result.error = true;
      return result;
    }

    // Handle soft deletes
    if (localRecord.is_deleted) {
      if (serverRecord) {
        const { error } = await supabase
          .from(tableName)
          .update({ is_deleted: true, deleted_at: localRecord.deleted_at })
          .eq('id', localRecord.id);
        
        if (error) {
          console.error('Error syncing delete:', error);
          result.error = true;
          return result;
        }
      }
      // Remove from local after successful sync of delete
      await offlineDb.hardDelete(storeName, localRecord.id);
      result.synced = true;
      return result;
    }

    // Prepare data for upsert (remove local-only fields)
    const dataToSync = cleanRecordForSync(localRecord, tableName);

    if (!serverRecord) {
      // New record - insert
      const { error } = await supabase.from(tableName).insert(dataToSync as any);
      if (error) {
        console.error(`Insert error for ${tableName}:`, error);
        // Check if it's a duplicate - might already exist
        if (error.code === '23505') {
          // Try update instead
          const { error: updateError } = await supabase
            .from(tableName)
            .update(dataToSync as any)
            .eq('id', localRecord.id);
          
          if (updateError) {
            console.error(`Update fallback error for ${tableName}:`, updateError);
            result.error = true;
            return result;
          }
        } else {
          result.error = true;
          return result;
        }
      }
      result.synced = true
    } else {
      // Existing record - check for conflicts using last-modified-wins
      const serverUpdatedAt = new Date((serverRecord as any).updated_at || (serverRecord as any).created_at || new Date()).getTime();
      const localUpdatedAtTime = localRecord.local_updated_at 
        ? new Date(localRecord.local_updated_at).getTime() 
        : new Date().getTime();

      if (localUpdatedAtTime >= serverUpdatedAt) {
        // Local is newer - push to server
        const { error } = await supabase
          .from(tableName)
          .update(dataToSync as any)
          .eq('id', localRecord.id);

        if (error) {
          console.error(`Update error for ${tableName}:`, error);
          result.error = true;
          return result;
        }
        result.synced = true;
      } else {
        // Server is newer - update local with server data
        result.conflict = true;
        await offlineDb.put(storeName, { ...serverRecord, sync_status: 'synced' } as any, 'synced');
        result.synced = true;
      }
    }
  } catch (error) {
    console.error('Sync record error:', error);
    result.error = true;
  }

  return result;
}

// Full sync - push pending then pull latest
export async function fullSync(ownerId: string): Promise<SyncResult> {
  if (!isOnline()) {
    return { success: false, synced: 0, errors: 0, conflicts: 0 };
  }

  // First push pending changes
  const pushResult = await syncToServer();
  
  // Then pull latest from server
  await initialSync(ownerId);

  // Save last sync time
  offlineDb.setLocalStorage(offlineDb.localStorageKeys.lastSyncTime, new Date().toISOString());

  return pushResult;
}

// Subscribe to online/offline events
let syncTimeout: NodeJS.Timeout | null = null;

export function setupAutoSync(ownerId: string, onSyncComplete?: (result: SyncResult) => void): () => void {
  const handleOnline = async () => {
    console.log('Back online - starting sync...');
    
    // Debounce to avoid multiple rapid syncs
    if (syncTimeout) clearTimeout(syncTimeout);
    
    syncTimeout = setTimeout(async () => {
      const pendingCount = await offlineDb.getPendingSyncCount();
      
      if (pendingCount > 0) {
        const result = await fullSync(ownerId);
        
        if (result.success && result.synced > 0) {
          toast({
            title: "All data synced successfully",
            description: `${result.synced} records synchronized`,
          });
        } else if (result.errors > 0) {
          toast({
            title: "Sync completed with errors",
            description: `${result.synced} synced, ${result.errors} failed`,
            variant: "destructive",
          });
        }
        
        onSyncComplete?.(result);
      }
    }, 2000);
  };

  const handleOffline = () => {
    console.log('Gone offline');
    toast({
      title: "You're offline",
      description: "Changes will be saved locally and synced when you're back online",
    });
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Initial sync if online
  if (isOnline()) {
    initialSync(ownerId).catch(console.error);
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (syncTimeout) clearTimeout(syncTimeout);
  };
}
