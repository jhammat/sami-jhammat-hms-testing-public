export type OfflineOutboxItemType =
  | "VITAL"
  | "DRAIN"
  | "SYMPTOM"
  | "MEDICATION_DOSE"
  | "CARE_PLAN_TASK"
  | "EDUCATION_COMPLETION";

export interface OfflineOutboxItem<TPayload = Record<string, unknown>> {
  id: string; // client-generated UUID for idempotency
  type: OfflineOutboxItemType;
  payload: TPayload;
  deviceRecordedAt: string; // ISO-8601 string when recorded on device
  createdAt: string; // ISO-8601 string when added to local outbox
  retryCount?: number;
  lastError?: string;
}

export interface BatchSyncRequest {
  items: OfflineOutboxItem[];
  clientVersion?: string;
  deviceInfo?: {
    platform?: string;
    userAgent?: string;
  };
}

export type BatchSyncItemStatus =
  | "PROCESSED"
  | "DUPLICATE_IGNORED"
  | "REJECTED"
  | "CONFLICT_RESOLVED";

export interface BatchSyncItemResult {
  id: string; // matches client-generated item ID
  type: OfflineOutboxItemType;
  status: BatchSyncItemStatus;
  entityId?: string;
  message?: string;
  deviceRecordedAt: string;
}

export interface BatchSyncResponse {
  syncedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  results: BatchSyncItemResult[];
  serverTime: string;
}
