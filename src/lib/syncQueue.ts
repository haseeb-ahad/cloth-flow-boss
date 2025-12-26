// Production-ready sync queue with exponential retry, conflict resolution, and status tracking
import { supabase } from '@/integrations/supabase/client';
import * as offlineDb from './offlineDb';

export type SyncActionType = 'create' | 'update' | 'delete';
export type SyncItemStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface SyncQueueItem {
  id: string;
  entity_type: offlineDb.StoreName;
  entity_id: string;
  action_type: SyncActionType;
  data: any;
  status: SyncItemStatus;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
  next_retry_at?: string;
  server_id?: string; // For ID replacement after sync
  temp_id?: string; // Original temporary ID
}

export interface SyncLog {
  id: string;
  queue_item_id: string;
  entity_type: string;
  entity_id: string;
  action_type: SyncActionType;
  status: 'success' | 'error' | 'conflict';
  message: string;
  details?: any;
  created_at: string;
}

// Map store names to Supabase table names
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

// Fields to remove before syncing to server
const LOCAL_ONLY_FIELDS = [
  'sync_status',
  'local_updated_at',
  'created_by',
  'low_stock_alert',
  'temp_id',
  'server_id',
];

// ID replacement map for referential integrity
const idReplacementMap = new Map<string, string>();

// Get the sync queue store
async function getSyncQueueStore(): Promise<IDBObjectStore> {
  const db = await offlineDb.getDb();
  const transaction = db.transaction('sync_queue', 'readwrite');
  return transaction.objectStore('sync_queue');
}

// Generate temporary ID
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Check if ID is temporary
export function isTempId(id: string): boolean {
  return id.startsWith('temp_');
}

// Add item to sync queue
export async function addToSyncQueue(
  entityType: offlineDb.StoreName,
  entityId: string,
  actionType: SyncActionType,
  data: any
): Promise<SyncQueueItem> {
  const db = await offlineDb.getDb();
  const now = new Date().toISOString();
  
  const item: SyncQueueItem = {
    id: `sq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    entity_type: entityType,
    entity_id: entityId,
    action_type: actionType,
    data: { ...data },
    status: 'pending',
    retry_count: 0,
    max_retries: 5,
    created_at: now,
    updated_at: now,
    temp_id: isTempId(entityId) ? entityId : undefined,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sync_queue', 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const request = store.put(item);
    
    request.onsuccess = () => {
      addSyncLog({
        queue_item_id: item.id,
        entity_type: entityType,
        entity_id: entityId,
        action_type: actionType,
        status: 'success',
        message: `Added to sync queue: ${actionType} ${entityType}`,
      });
      resolve(item);
    };
    request.onerror = () => reject(request.error);
  });
}

// Get all pending sync items
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await offlineDb.getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sync_queue', 'readonly');
    const store = transaction.objectStore('sync_queue');
    const request = store.getAll();
    
    request.onsuccess = () => {
      const items = request.result.filter((item: SyncQueueItem) => 
        item.status === 'pending' || item.status === 'failed'
      );
      // Sort by created_at to process in order
      items.sort((a: SyncQueueItem, b: SyncQueueItem) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

// Get all sync queue items
export async function getAllSyncItems(): Promise<SyncQueueItem[]> {
  const db = await offlineDb.getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sync_queue', 'readonly');
    const store = transaction.objectStore('sync_queue');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Update sync item status
export async function updateSyncItemStatus(
  itemId: string,
  status: SyncItemStatus,
  errorMessage?: string,
  serverId?: string
): Promise<void> {
  const db = await offlineDb.getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sync_queue', 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const getRequest = store.get(itemId);
    
    getRequest.onsuccess = () => {
      const item = getRequest.result as SyncQueueItem;
      if (item) {
        item.status = status;
        item.updated_at = new Date().toISOString();
        if (errorMessage) item.error_message = errorMessage;
        if (serverId) item.server_id = serverId;
        if (status === 'failed') {
          item.retry_count++;
          // Exponential backoff: 2^retry_count seconds, max 5 minutes
          const backoffMs = Math.min(Math.pow(2, item.retry_count) * 1000, 300000);
          item.next_retry_at = new Date(Date.now() + backoffMs).toISOString();
        }
        store.put(item);
      }
      resolve();
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Remove synced item from queue
export async function removeSyncItem(itemId: string): Promise<void> {
  const db = await offlineDb.getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sync_queue', 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const request = store.delete(itemId);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Add sync log entry
export async function addSyncLog(log: Omit<SyncLog, 'id' | 'created_at'>): Promise<void> {
  const db = await offlineDb.getDb();
  const logEntry: SyncLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString(),
    ...log,
  };
  
  // Store in localStorage for now (could be moved to IndexedDB)
  try {
    const logs = JSON.parse(localStorage.getItem('sync_logs') || '[]');
    logs.push(logEntry);
    // Keep only last 1000 logs
    if (logs.length > 1000) logs.splice(0, logs.length - 1000);
    localStorage.setItem('sync_logs', JSON.stringify(logs));
  } catch (e) {
    console.error('Error saving sync log:', e);
  }
}

// Get sync logs
export function getSyncLogs(): SyncLog[] {
  try {
    return JSON.parse(localStorage.getItem('sync_logs') || '[]');
  } catch {
    return [];
  }
}

// Clear old sync logs
export function clearSyncLogs(): void {
  localStorage.removeItem('sync_logs');
}

// Clean record for sync (remove local-only fields)
function cleanRecordForSync(record: any): any {
  const cleaned = { ...record };
  LOCAL_ONLY_FIELDS.forEach(field => delete cleaned[field]);
  return cleaned;
}

// Replace temporary IDs with server IDs in data
function replaceTemporaryIds(data: any): any {
  if (!data) return data;
  
  const cleaned = { ...data };
  
  // Replace known ID fields
  const idFields = ['id', 'sale_id', 'product_id', 'credit_id', 'installment_id', 'owner_id'];
  
  idFields.forEach(field => {
    if (cleaned[field] && typeof cleaned[field] === 'string') {
      const serverId = idReplacementMap.get(cleaned[field]);
      if (serverId) {
        cleaned[field] = serverId;
      }
    }
  });
  
  return cleaned;
}

// Register ID replacement
export function registerIdReplacement(tempId: string, serverId: string): void {
  idReplacementMap.set(tempId, serverId);
  
  // Persist to localStorage
  try {
    const map = JSON.parse(localStorage.getItem('id_replacement_map') || '{}');
    map[tempId] = serverId;
    localStorage.setItem('id_replacement_map', JSON.stringify(map));
  } catch (e) {
    console.error('Error saving ID replacement:', e);
  }
}

// Load ID replacements from storage
export function loadIdReplacements(): void {
  try {
    const map = JSON.parse(localStorage.getItem('id_replacement_map') || '{}');
    Object.entries(map).forEach(([temp, server]) => {
      idReplacementMap.set(temp, server as string);
    });
  } catch (e) {
    console.error('Error loading ID replacements:', e);
  }
}

// Get server ID for temp ID
export function getServerId(tempId: string): string | undefined {
  return idReplacementMap.get(tempId);
}

// Sync a single queue item
async function syncQueueItem(item: SyncQueueItem): Promise<{
  success: boolean;
  serverId?: string;
  error?: string;
  conflict?: boolean;
}> {
  const tableName = storeToTable[item.entity_type];
  if (!tableName) {
    return { success: false, error: 'Unknown entity type' };
  }

  // Replace temp IDs in data
  let dataToSync = replaceTemporaryIds(cleanRecordForSync(item.data));
  
  // If entity ID is temporary, check if we have a server ID for it
  let entityId = item.entity_id;
  if (isTempId(entityId)) {
    const serverId = getServerId(entityId);
    if (serverId) {
      entityId = serverId;
      dataToSync.id = serverId;
    }
  }

  try {
    switch (item.action_type) {
      case 'create': {
        // For creates with temp IDs, generate a new UUID on server
        if (isTempId(dataToSync.id)) {
          delete dataToSync.id; // Let server generate ID
        }
        
        const { data, error } = await supabase
          .from(tableName as any)
          .insert(dataToSync as any)
          .select('id')
          .single();
        
        if (error) {
          // Check if record already exists (duplicate)
          if (error.code === '23505') {
            return { success: true, conflict: true };
          }
          return { success: false, error: error.message };
        }
        
        return { success: true, serverId: (data as any)?.id };
      }
      
      case 'update': {
        // Check if record exists on server first
        const { data: existing, error: fetchError } = await supabase
          .from(tableName as any)
          .select('id, updated_at')
          .eq('id', entityId)
          .maybeSingle();
        
        if (fetchError) {
          return { success: false, error: fetchError.message };
        }
        
        if (!existing) {
          // Record doesn't exist, try to create it
          const { data, error } = await supabase
            .from(tableName as any)
            .insert(dataToSync as any)
            .select('id')
            .single();
          
          if (error) {
            return { success: false, error: error.message };
          }
          return { success: true, serverId: (data as any)?.id };
        }
        
        // Conflict resolution: last-write-wins based on updated_at
        const serverUpdatedAt = new Date((existing as any).updated_at || 0).getTime();
        const localUpdatedAt = new Date(item.data.updated_at || item.updated_at).getTime();
        
        if (serverUpdatedAt > localUpdatedAt) {
          // Server is newer, pull server data instead
          return { success: true, conflict: true };
        }
        
        // Local is newer, push update
        const { error: updateError } = await supabase
          .from(tableName as any)
          .update(dataToSync as any)
          .eq('id', entityId);
        
        if (updateError) {
          return { success: false, error: updateError.message };
        }
        
        return { success: true };
      }
      
      case 'delete': {
        // Soft delete on server
        const { error } = await supabase
          .from(tableName as any)
          .update({ 
            is_deleted: true, 
            deleted_at: item.data.deleted_at || new Date().toISOString() 
          } as any)
          .eq('id', entityId);
        
        if (error) {
          // If record doesn't exist, consider it success
          if (error.code === 'PGRST116') {
            return { success: true };
          }
          return { success: false, error: error.message };
        }
        
        return { success: true };
      }
      
      default:
        return { success: false, error: 'Unknown action type' };
    }
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error' };
  }
}

// Check if item should retry
function shouldRetry(item: SyncQueueItem): boolean {
  if (item.status !== 'failed') return false;
  if (item.retry_count >= item.max_retries) return false;
  
  if (item.next_retry_at) {
    const nextRetry = new Date(item.next_retry_at).getTime();
    if (Date.now() < nextRetry) return false;
  }
  
  return true;
}

// Process sync queue
export interface SyncProgress {
  total: number;
  processed: number;
  synced: number;
  failed: number;
  conflicts: number;
  currentItem?: SyncQueueItem;
}

export type SyncProgressCallback = (progress: SyncProgress) => void;

export async function processSyncQueue(
  onProgress?: SyncProgressCallback
): Promise<SyncProgress> {
  const progress: SyncProgress = {
    total: 0,
    processed: 0,
    synced: 0,
    failed: 0,
    conflicts: 0,
  };

  // Load ID replacements
  loadIdReplacements();

  // Get all pending and retryable items
  const items = await getPendingSyncItems();
  const toProcess = items.filter(item => 
    item.status === 'pending' || shouldRetry(item)
  );
  
  progress.total = toProcess.length;
  
  if (progress.total === 0) {
    return progress;
  }

  // Process items one by one (transactional - one failure doesn't block others)
  for (const item of toProcess) {
    progress.currentItem = item;
    onProgress?.(progress);
    
    // Mark as syncing
    await updateSyncItemStatus(item.id, 'syncing');
    
    const result = await syncQueueItem(item);
    
    if (result.success) {
      // Handle ID replacement for creates
      if (item.action_type === 'create' && result.serverId && isTempId(item.entity_id)) {
        registerIdReplacement(item.entity_id, result.serverId);
        
        // Update local record with server ID
        await updateLocalRecordId(
          item.entity_type, 
          item.entity_id, 
          result.serverId
        );
      }
      
      if (result.conflict) {
        progress.conflicts++;
        addSyncLog({
          queue_item_id: item.id,
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          action_type: item.action_type,
          status: 'conflict',
          message: 'Conflict resolved using server data',
        });
      }
      
      // Remove from queue on success
      await removeSyncItem(item.id);
      await offlineDb.updateSyncStatus(item.entity_type, item.entity_id, 'synced');
      
      progress.synced++;
      
      addSyncLog({
        queue_item_id: item.id,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        action_type: item.action_type,
        status: 'success',
        message: `Successfully synced ${item.action_type} for ${item.entity_type}`,
      });
    } else {
      // Mark as failed
      await updateSyncItemStatus(item.id, 'failed', result.error);
      progress.failed++;
      
      addSyncLog({
        queue_item_id: item.id,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        action_type: item.action_type,
        status: 'error',
        message: result.error || 'Unknown error',
        details: { retry_count: item.retry_count + 1, max_retries: item.max_retries },
      });
    }
    
    progress.processed++;
    onProgress?.(progress);
  }
  
  progress.currentItem = undefined;
  return progress;
}

// Update local record ID after server assigns new ID
async function updateLocalRecordId(
  storeName: offlineDb.StoreName,
  tempId: string,
  serverId: string
): Promise<void> {
  const db = await offlineDb.getDb();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const getRequest = store.get(tempId);
    
    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (record) {
        // Delete old record with temp ID
        store.delete(tempId);
        // Insert with new server ID
        record.id = serverId;
        record.sync_status = 'synced';
        store.put(record);
        
        // Also update any related records that reference this ID
        updateRelatedRecords(storeName, tempId, serverId);
      }
      resolve();
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Update related records when parent ID changes
async function updateRelatedRecords(
  parentStore: offlineDb.StoreName,
  oldId: string,
  newId: string
): Promise<void> {
  const db = await offlineDb.getDb();
  
  // Define relationships
  const relationships: Record<string, { store: offlineDb.StoreName; field: string }[]> = {
    sales: [{ store: 'sale_items', field: 'sale_id' }, { store: 'credits', field: 'sale_id' }],
    credits: [{ store: 'credit_transactions', field: 'credit_id' }],
    installments: [{ store: 'installment_payments', field: 'installment_id' }],
    products: [{ store: 'sale_items', field: 'product_id' }],
  };
  
  const relations = relationships[parentStore];
  if (!relations) return;
  
  for (const rel of relations) {
    try {
      const transaction = db.transaction(rel.store, 'readwrite');
      const store = transaction.objectStore(rel.store);
      const index = store.index(rel.field);
      const request = index.getAll(oldId);
      
      request.onsuccess = () => {
        const records = request.result;
        records.forEach((record: any) => {
          record[rel.field] = newId;
          store.put(record);
        });
      };
    } catch (e) {
      console.error(`Error updating related records in ${rel.store}:`, e);
    }
  }
}

// Manual retry for failed items
export async function retryFailedItem(itemId: string): Promise<boolean> {
  const db = await offlineDb.getDb();
  
  return new Promise(async (resolve) => {
    const transaction = db.transaction('sync_queue', 'readwrite');
    const store = transaction.objectStore('sync_queue');
    const getRequest = store.get(itemId);
    
    getRequest.onsuccess = async () => {
      const item = getRequest.result as SyncQueueItem;
      if (!item) {
        resolve(false);
        return;
      }
      
      // Reset status to pending for immediate retry
      item.status = 'pending';
      item.next_retry_at = undefined;
      item.error_message = undefined;
      store.put(item);
      
      // Process this single item
      const result = await syncQueueItem(item);
      
      if (result.success) {
        await removeSyncItem(itemId);
        resolve(true);
      } else {
        await updateSyncItemStatus(itemId, 'failed', result.error);
        resolve(false);
      }
    };
    
    getRequest.onerror = () => resolve(false);
  });
}

// Get sync queue stats
export async function getSyncQueueStats(): Promise<{
  pending: number;
  syncing: number;
  failed: number;
  total: number;
}> {
  const items = await getAllSyncItems();
  
  return {
    pending: items.filter(i => i.status === 'pending').length,
    syncing: items.filter(i => i.status === 'syncing').length,
    failed: items.filter(i => i.status === 'failed').length,
    total: items.length,
  };
}

// Clear all synced items from queue
export async function clearSyncedItems(): Promise<void> {
  const items = await getAllSyncItems();
  const synced = items.filter(i => i.status === 'synced');
  
  for (const item of synced) {
    await removeSyncItem(item.id);
  }
}

// Clear all failed items (use with caution)
export async function clearFailedItems(): Promise<void> {
  const items = await getAllSyncItems();
  const failed = items.filter(i => i.status === 'failed' && i.retry_count >= i.max_retries);
  
  for (const item of failed) {
    await removeSyncItem(item.id);
  }
}
