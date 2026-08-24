import { useEffect, useState, useCallback } from "react";
import type {
  BatchSyncItemResult,
  BatchSyncResponse,
  OfflineOutboxItem,
  OfflineOutboxItemType,
} from "@wonflow/contracts";

const DB_NAME = "wonflow_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "offline_outbox";

type SyncListener = () => void;
const listeners = new Set<SyncListener>();

function notifyListeners() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // ignore
    }
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment."));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generates a standard RFC4122 v4 UUID
 */
export function generateClientUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Enqueues a clinical entry into the local IndexedDB outbox.
 */
export async function enqueueOutboxItem<T = Record<string, unknown>>(
  type: OfflineOutboxItemType,
  payload: T,
  deviceRecordedAt?: string,
): Promise<OfflineOutboxItem<T>> {
  const item: OfflineOutboxItem<T> = {
    id: generateClientUuid(),
    type,
    payload,
    deviceRecordedAt: deviceRecordedAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(item);

    request.onsuccess = () => {
      notifyListeners();
      resolve(item);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Gets all pending outbox items waiting for synchronization.
 */
export async function getPendingOutboxItems(): Promise<OfflineOutboxItem[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as OfflineOutboxItem[]);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Removes successfully processed or duplicate items from the local outbox.
 */
export async function removeOutboxItems(ids: string[]): Promise<void> {
  if (!ids.length) return;
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      for (const id of ids) {
        store.delete(id);
      }
      tx.oncomplete = () => {
        notifyListeners();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore outbox deletion failures
  }
}

/**
 * Flushes all pending outbox entries to the server.
 */
export async function flushOutbox(): Promise<{
  synced: number;
  duplicate: number;
  rejected: number;
  results: BatchSyncItemResult[];
} | null> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return null;
  }

  const pending = await getPendingOutboxItems();
  if (pending.length === 0) {
    return { synced: 0, duplicate: 0, rejected: 0, results: [] };
  }

  try {
    const res = await fetch("/api/v1/patient/offline/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        items: pending,
        clientVersion: "1.0.0",
        deviceInfo: {
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        },
      }),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as BatchSyncResponse;

    // Purge items that are accepted or already registered as duplicates
    const idsToPurge = data.results
      .filter((r) => r.status === "PROCESSED" || r.status === "DUPLICATE_IGNORED")
      .map((r) => r.id);

    await removeOutboxItems(idsToPurge);

    return {
      synced: data.syncedCount,
      duplicate: data.duplicateCount,
      rejected: data.rejectedCount,
      results: data.results,
    };
  } catch {
    return null;
  }
}

/**
 * React hook to observe online state, outbox queue length, and trigger auto-sync.
 */
export function useOfflineSyncStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const refreshCount = useCallback(async () => {
    const items = await getPendingOutboxItems();
    setPendingCount(items.length);
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    try {
      setIsSyncing(true);
      const result = await flushOutbox();
      if (result) {
        setLastSyncedAt(new Date());
      }
    } finally {
      setIsSyncing(false);
      await refreshCount();
    }
  }, [isSyncing, refreshCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", () => void triggerSync());

    const listener: SyncListener = () => {
      void refreshCount();
    };
    listeners.add(listener);

    const timer = setTimeout(() => {
      void refreshCount();
      void triggerSync();
    }, 0);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      listeners.delete(listener);
    };
  }, [refreshCount, triggerSync]);


  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncedAt,
    syncNow: triggerSync,
    enqueue: enqueueOutboxItem,
  };
}
