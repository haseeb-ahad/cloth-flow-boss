// IndexedDB wrapper for offline-first functionality
const DB_NAME = 'invoxa_offline_db';
const DB_VERSION = 1;

export type SyncStatus = 'synced' | 'pending' | 'error';

export interface OfflineRecord {
  id: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  is_deleted?: boolean;
  local_updated_at: string; // For conflict resolution
  owner_id?: string | null;
}

export interface OfflineProduct extends OfflineRecord {
  name: string;
  description?: string | null;
  category?: string | null;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  quantity_type?: string | null;
}

export interface OfflineSale extends OfflineRecord {
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
}

export interface OfflineSaleItem extends OfflineRecord {
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  purchase_price: number;
  profit: number;
  is_return?: boolean;
}

export interface OfflineCredit extends OfflineRecord {
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
}

export interface OfflineCreditTransaction extends OfflineRecord {
  credit_id: string;
  customer_name: string;
  customer_phone?: string | null;
  amount: number;
  transaction_date: string;
  notes?: string | null;
}

export interface OfflineExpense extends OfflineRecord {
  expense_type: string;
  amount: number;
  expense_date: string;
  description?: string | null;
}

export interface OfflinePaymentLedger extends OfflineRecord {
  customer_name: string;
  customer_phone?: string | null;
  payment_amount: number;
  payment_date: string;
  details: any;
  description?: string | null;
  notes?: string | null;
  image_url?: string | null;
}

export interface OfflineInstallment extends OfflineRecord {
  customer_name: string;
  customer_phone?: string | null;
  total_amount: number;
  installment_amount: number;
  paid_amount: number;
  remaining_amount: number;
  frequency: string;
  status: string;
  next_due_date?: string | null;
  notes?: string | null;
}

export interface OfflineInstallmentPayment extends OfflineRecord {
  installment_id: string;
  amount: number;
  payment_date: string;
  notes?: string | null;
}

export interface OfflineAppSettings {
  id: string;
  owner_id?: string | null;
  app_name?: string | null;
  shop_name?: string | null;
  shop_address?: string | null;
  phone_numbers?: string[] | null;
  owner_names?: string[] | null;
  thank_you_message?: string | null;
  footer_message?: string | null;
  logo_url?: string | null;
  language?: string | null;
  timezone?: string | null;
  worker_name?: string | null;
  worker_phone?: string | null;
  description?: string | null;
  updated_at?: string | null;
  sync_status: SyncStatus;
  local_updated_at: string;
}

const STORES = {
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
  sync_queue: 'sync_queue',
} as const;

export type StoreName = keyof typeof STORES;

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores with indexes
      Object.values(STORES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          
          // Common indexes
          store.createIndex('sync_status', 'sync_status', { unique: false });
          store.createIndex('owner_id', 'owner_id', { unique: false });
          store.createIndex('local_updated_at', 'local_updated_at', { unique: false });
          
          // Store-specific indexes
          if (storeName === 'sale_items') {
            store.createIndex('sale_id', 'sale_id', { unique: false });
          }
          if (storeName === 'credit_transactions') {
            store.createIndex('credit_id', 'credit_id', { unique: false });
          }
          if (storeName === 'installment_payments') {
            store.createIndex('installment_id', 'installment_id', { unique: false });
          }
        }
      });
    };
  });

  return dbPromise;
}

export async function getDb(): Promise<IDBDatabase> {
  return openDatabase();
}

// Generic CRUD operations
export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
      // Filter out soft-deleted items
      const results = (request.result as T[]).filter((item: any) => !item.is_deleted);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getAllIncludingDeleted<T>(storeName: StoreName): Promise<T[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getById<T>(storeName: StoreName, id: string): Promise<T | undefined> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function put<T extends { id: string }>(
  storeName: StoreName, 
  data: T,
  syncStatus: SyncStatus = 'pending'
): Promise<T> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  const record = {
    ...data,
    sync_status: syncStatus,
    local_updated_at: now,
    updated_at: (data as any).updated_at || now,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(record);

    request.onsuccess = () => resolve(record as T);
    request.onerror = () => reject(request.error);
  });
}

export async function bulkPut<T extends { id: string }>(
  storeName: StoreName, 
  items: T[],
  syncStatus: SyncStatus = 'synced'
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    items.forEach((item) => {
      const record = {
        ...item,
        sync_status: syncStatus,
        local_updated_at: (item as any).local_updated_at || now,
      };
      store.put(record);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function softDelete(storeName: StoreName, id: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (record) {
        record.is_deleted = true;
        record.deleted_at = now;
        record.sync_status = 'pending';
        record.local_updated_at = now;
        store.put(record);
      }
      resolve();
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function hardDelete(storeName: StoreName, id: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingSyncRecords<T>(storeName: StoreName): Promise<T[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index('sync_status');
    const request = index.getAll('pending');

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function updateSyncStatus(
  storeName: StoreName, 
  id: string, 
  status: SyncStatus
): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (record) {
        record.sync_status = status;
        store.put(record);
      }
      resolve();
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getByIndex<T>(
  storeName: StoreName,
  indexName: string,
  value: string
): Promise<T[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => {
      const results = (request.result as T[]).filter((item: any) => !item.is_deleted);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

// Count pending sync records across all stores
export async function getPendingSyncCount(): Promise<number> {
  let count = 0;
  for (const storeName of Object.keys(STORES) as StoreName[]) {
    if (storeName === 'sync_queue') continue;
    const pending = await getPendingSyncRecords(storeName);
    count += pending.length;
  }
  return count;
}

export { STORES };
