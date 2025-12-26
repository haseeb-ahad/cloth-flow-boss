// Production-ready offline-first delete manager
// Handles soft delete, queue integration, undo, parent-child relationships, and conflict resolution
import * as offlineDb from './offlineDb';
import { addToSyncQueue, getPendingSyncItems, removeSyncItem, isTempId, SyncQueueItem } from './syncQueue';
import { supabase } from '@/integrations/supabase/client';

export type DeleteStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface DeletedRecord {
  id: string;
  entity_type: offlineDb.StoreName;
  original_data: any;
  deleted_at: string;
  status: DeleteStatus;
  sync_queue_id?: string;
  children?: DeletedRecord[];
  can_undo: boolean;
  error_message?: string;
}

// Track recently deleted records for undo functionality
const deletedRecordsCache = new Map<string, DeletedRecord>();
const UNDO_TIMEOUT_MS = 30000; // 30 seconds to undo

// Parent-child relationships for cascade deletes
const CASCADE_RELATIONSHIPS: Record<string, { store: offlineDb.StoreName; foreignKey: string }[]> = {
  sales: [
    { store: 'sale_items', foreignKey: 'sale_id' },
    { store: 'credits', foreignKey: 'sale_id' },
  ],
  credits: [
    { store: 'credit_transactions', foreignKey: 'credit_id' },
  ],
  installments: [
    { store: 'installment_payments', foreignKey: 'installment_id' },
  ],
};

// Store to Supabase table mapping
const storeToTable: Record<string, string | null> = {
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
  customers: null,
  workers: null,
  sync_queue: null,
  sync_logs: null,
};

/**
 * Soft delete a record locally and queue for server sync
 * Handles parent-child relationships and cancels pending create operations
 */
export async function softDeleteRecord(
  storeName: offlineDb.StoreName,
  id: string,
  isOnline: boolean
): Promise<DeletedRecord> {
  const now = new Date().toISOString();
  
  // Get the original record for undo capability
  const originalData = await offlineDb.getById<any>(storeName, id);
  if (!originalData) {
    throw new Error(`Record ${id} not found in ${storeName}`);
  }

  // Check if this is a record created offline but not yet synced
  const wasCreatedOffline = originalData.sync_status === 'pending' && !originalData.server_synced;
  
  // Create deleted record entry
  const deletedRecord: DeletedRecord = {
    id,
    entity_type: storeName,
    original_data: { ...originalData },
    deleted_at: now,
    status: 'pending',
    can_undo: true,
    children: [],
  };

  // Handle cascade deletes for child records
  const relationships = CASCADE_RELATIONSHIPS[storeName];
  if (relationships) {
    for (const rel of relationships) {
      try {
        const children = await offlineDb.getByIndex<any>(rel.store, rel.foreignKey, id);
        for (const child of children) {
          if (!child.is_deleted) {
            // Recursively delete children
            const childDeletedRecord = await softDeleteRecord(rel.store, child.id, isOnline);
            deletedRecord.children!.push(childDeletedRecord);
          }
        }
      } catch (e) {
        console.warn(`Error deleting children from ${rel.store}:`, e);
      }
    }
  }

  // If record was created offline and never synced, cancel the sync instead
  if (wasCreatedOffline || isTempId(id)) {
    await cancelPendingCreateSync(storeName, id);
    // Still mark as deleted locally to hide from UI
    await offlineDb.softDelete(storeName, id);
    deletedRecord.status = 'synced'; // No need to sync delete for never-synced records
    deletedRecord.can_undo = true;
  } else {
    // Soft delete in offline DB
    await offlineDb.softDelete(storeName, id);
    
    // Add to sync queue if we need to sync with server
    if (storeToTable[storeName]) {
      const queueItem = await addToSyncQueue(storeName, id, 'delete', {
        id,
        is_deleted: true,
        deleted_at: now,
      });
      deletedRecord.sync_queue_id = queueItem.id;
    }

    // If online, attempt immediate sync
    if (isOnline && storeToTable[storeName]) {
      try {
        const result = await syncDeleteToServer(storeName, id, now);
        if (result.success) {
          deletedRecord.status = 'synced';
          // Remove from sync queue since it's already synced
          if (deletedRecord.sync_queue_id) {
            await removeSyncItem(deletedRecord.sync_queue_id);
          }
          await offlineDb.updateSyncStatus(storeName, id, 'synced');
        } else {
          deletedRecord.status = 'pending';
          deletedRecord.error_message = result.error;
        }
      } catch (e: any) {
        console.warn('Failed to sync delete immediately:', e);
        deletedRecord.status = 'pending';
        deletedRecord.error_message = e.message;
      }
    }
  }

  // Cache for undo functionality
  deletedRecordsCache.set(id, deletedRecord);
  
  // Auto-expire undo capability
  setTimeout(() => {
    const cached = deletedRecordsCache.get(id);
    if (cached && cached.can_undo) {
      cached.can_undo = false;
      deletedRecordsCache.set(id, cached);
    }
  }, UNDO_TIMEOUT_MS);

  return deletedRecord;
}

/**
 * Cancel pending create sync for records created offline but deleted before sync
 */
async function cancelPendingCreateSync(
  storeName: offlineDb.StoreName,
  entityId: string
): Promise<boolean> {
  try {
    const pendingItems = await getPendingSyncItems();
    
    for (const item of pendingItems) {
      if (
        item.entity_type === storeName &&
        item.entity_id === entityId &&
        (item.action_type === 'create' || item.action_type === 'update')
      ) {
        // Remove the pending create/update from queue
        await removeSyncItem(item.id);
        console.log(`Cancelled pending ${item.action_type} sync for ${storeName}:${entityId}`);
      }
    }
    
    return true;
  } catch (e) {
    console.error('Error cancelling pending sync:', e);
    return false;
  }
}

/**
 * Sync delete operation to server
 */
async function syncDeleteToServer(
  storeName: offlineDb.StoreName,
  id: string,
  deletedAt: string
): Promise<{ success: boolean; error?: string }> {
  const tableName = storeToTable[storeName];
  if (!tableName) {
    return { success: true }; // No server table to update
  }

  try {
    const { error } = await supabase
      .from(tableName as any)
      .update({ is_deleted: true, deleted_at: deletedAt } as any)
      .eq('id', id);

    if (error) {
      // If record doesn't exist on server, consider it a success
      if (error.code === 'PGRST116' || error.message.includes('no rows')) {
        return { success: true };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error' };
  }
}

/**
 * Undo a soft delete (restore record)
 */
export async function undoDelete(
  id: string,
  isOnline: boolean
): Promise<{ success: boolean; error?: string }> {
  const deletedRecord = deletedRecordsCache.get(id);
  
  if (!deletedRecord) {
    return { success: false, error: 'Delete record not found in cache' };
  }

  if (!deletedRecord.can_undo) {
    return { success: false, error: 'Undo period has expired' };
  }

  try {
    // Restore the original record
    const restoredData = {
      ...deletedRecord.original_data,
      is_deleted: false,
      deleted_at: null,
      sync_status: 'pending',
    };

    await offlineDb.put(deletedRecord.entity_type, restoredData, 'pending');

    // Remove delete from sync queue if not yet synced
    if (deletedRecord.sync_queue_id && deletedRecord.status === 'pending') {
      await removeSyncItem(deletedRecord.sync_queue_id);
    }

    // If already synced to server, we need to restore on server too
    if (deletedRecord.status === 'synced' && isOnline && storeToTable[deletedRecord.entity_type]) {
      const tableName = storeToTable[deletedRecord.entity_type]!;
      const { error } = await supabase
        .from(tableName as any)
        .update({ is_deleted: false, deleted_at: null } as any)
        .eq('id', id);

      if (error) {
        console.warn('Failed to restore on server:', error);
        // Still mark as pending for next sync
      } else {
        await offlineDb.updateSyncStatus(deletedRecord.entity_type, id, 'synced');
      }
    }

    // Restore children
    if (deletedRecord.children && deletedRecord.children.length > 0) {
      for (const child of deletedRecord.children) {
        await undoDelete(child.id, isOnline);
      }
    }

    // Remove from cache
    deletedRecordsCache.delete(id);

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to undo delete' };
  }
}

/**
 * Get deleted record info for undo UI
 */
export function getDeletedRecord(id: string): DeletedRecord | undefined {
  return deletedRecordsCache.get(id);
}

/**
 * Check if a record can still be undone
 */
export function canUndoDelete(id: string): boolean {
  const record = deletedRecordsCache.get(id);
  return record?.can_undo ?? false;
}

/**
 * Get all recently deleted records that can be undone
 */
export function getUndoableDeletes(): DeletedRecord[] {
  return Array.from(deletedRecordsCache.values()).filter(r => r.can_undo);
}

/**
 * Hard delete a record (permanent removal) - only after server confirmation
 */
export async function hardDeleteRecord(
  storeName: offlineDb.StoreName,
  id: string
): Promise<void> {
  // Verify it's marked as deleted and synced
  const record = await offlineDb.getById<any>(storeName, id);
  if (record && record.is_deleted && record.sync_status === 'synced') {
    await offlineDb.hardDelete(storeName, id);
    deletedRecordsCache.delete(id);
  }
}

/**
 * Process all pending delete syncs
 * Called during sync queue processing - deletes should be processed AFTER creates/updates
 */
export async function processPendingDeletes(): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  const result = { synced: 0, failed: 0, errors: [] as string[] };
  
  // Get all deleted records pending sync
  const allStores = Object.keys(storeToTable).filter(s => storeToTable[s] !== null);
  
  for (const storeName of allStores) {
    try {
      const allRecords = await offlineDb.getAllIncludingDeleted<any>(storeName as offlineDb.StoreName);
      const deletedPending = allRecords.filter(r => r.is_deleted && r.sync_status === 'pending');
      
      for (const record of deletedPending) {
        const syncResult = await syncDeleteToServer(
          storeName as offlineDb.StoreName,
          record.id,
          record.deleted_at || new Date().toISOString()
        );
        
        if (syncResult.success) {
          await offlineDb.updateSyncStatus(storeName as offlineDb.StoreName, record.id, 'synced');
          result.synced++;
        } else {
          result.failed++;
          result.errors.push(`${storeName}:${record.id} - ${syncResult.error}`);
        }
      }
    } catch (e: any) {
      console.error(`Error processing deletes for ${storeName}:`, e);
      result.errors.push(`${storeName} - ${e.message}`);
    }
  }
  
  return result;
}

/**
 * Clean up old deleted records that are synced (optional background cleanup)
 */
export async function cleanupSyncedDeletes(olderThanDays: number = 30): Promise<number> {
  let cleaned = 0;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const allStores = Object.keys(storeToTable).filter(s => storeToTable[s] !== null);
  
  for (const storeName of allStores) {
    try {
      const allRecords = await offlineDb.getAllIncludingDeleted<any>(storeName as offlineDb.StoreName);
      const oldDeleted = allRecords.filter(r => 
        r.is_deleted && 
        r.sync_status === 'synced' && 
        new Date(r.deleted_at || r.local_updated_at) < cutoffDate
      );
      
      for (const record of oldDeleted) {
        await offlineDb.hardDelete(storeName as offlineDb.StoreName, record.id);
        cleaned++;
      }
    } catch (e) {
      console.warn(`Error cleaning up ${storeName}:`, e);
    }
  }
  
  return cleaned;
}

/**
 * Verify no orphan records exist after delete operations
 */
export async function verifyNoOrphans(storeName: offlineDb.StoreName, parentId: string): Promise<{
  hasOrphans: boolean;
  orphanIds: string[];
}> {
  const result = { hasOrphans: false, orphanIds: [] as string[] };
  
  const relationships = CASCADE_RELATIONSHIPS[storeName];
  if (!relationships) return result;
  
  for (const rel of relationships) {
    try {
      const children = await offlineDb.getByIndex<any>(rel.store, rel.foreignKey, parentId);
      const orphans = children.filter(c => !c.is_deleted);
      
      if (orphans.length > 0) {
        result.hasOrphans = true;
        result.orphanIds.push(...orphans.map(o => o.id));
      }
    } catch (e) {
      console.warn(`Error checking orphans in ${rel.store}:`, e);
    }
  }
  
  return result;
}

/**
 * Get delete status for UI display
 */
export function getDeleteStatusColor(status: DeleteStatus): string {
  switch (status) {
    case 'pending': return 'hsl(var(--chart-2))'; // orange
    case 'syncing': return 'hsl(var(--chart-4))'; // blue
    case 'synced': return 'hsl(var(--chart-3))'; // green
    case 'failed': return 'hsl(var(--destructive))'; // red
    default: return 'hsl(var(--muted-foreground))';
  }
}
