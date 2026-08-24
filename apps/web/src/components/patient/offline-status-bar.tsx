"use client";

import { CheckCircle2, CloudUpload, RefreshCw, WifiOff } from "lucide-react";
import { useState } from "react";
import { useOfflineSyncStatus } from "@/lib/offline/indexed-db-outbox";

export function OfflineStatusBar() {
  const { isOnline, pendingCount, isSyncing, lastSyncedAt, syncNow } = useOfflineSyncStatus();
  const [dismissed, setDismissed] = useState(false);

  // If online, no pending items, and either not syncing or dismissed, show nothing
  if (isOnline && pendingCount === 0 && !isSyncing && (dismissed || !lastSyncedAt)) {
    return null;
  }



  return (
    <div className="mb-4 animate-fadeIn transition-all">
      {/* 1. Offline Mode Banner */}
      {!isOnline && (
        <div className="flex flex-col items-start justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900 shadow-sm sm:flex-row sm:items-center dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              <WifiOff className="h-4 w-4" />
            </div>
            <div>
              <p className="font-black text-amber-950 dark:text-amber-100">
                You are currently offline
              </p>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80">
                {pendingCount > 0
                  ? `${pendingCount} entries saved locally on your phone. They will automatically sync when connection returns.`
                  : "You can keep logging vitals, drains, and symptoms. Records will be safely saved to your phone."}
              </p>
            </div>
          </div>

          <span className="rounded-xl bg-amber-200/60 px-2.5 py-1 text-[10px] font-black uppercase text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
            Outbox Active
          </span>
        </div>
      )}

      {/* 2. Actively Syncing Banner */}
      {isOnline && isSyncing && (
        <div className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-xs font-semibold text-indigo-900 shadow-sm dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
            <div>
              <p className="font-black text-indigo-950 dark:text-indigo-100">
                Synchronising offline logs...
              </p>
              <p className="text-[11px] text-indigo-700/90 dark:text-indigo-300/80">
                Sending {pendingCount} recorded items to your clinical care team.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Online with Pending Outbox Items */}
      {isOnline && !isSyncing && pendingCount > 0 && (
        <div className="flex flex-col items-start justify-between gap-2 rounded-2xl border border-teal-200 bg-teal-50 p-3 text-xs font-semibold text-teal-900 shadow-sm sm:flex-row sm:items-center dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-200">
          <div className="flex items-center gap-2.5">
            <CloudUpload className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <div>
              <p className="font-black text-teal-950 dark:text-teal-100">
                {pendingCount} offline logs ready to sync
              </p>
              <p className="text-[11px] text-teal-700/90 dark:text-teal-300/80">
                Connection restored. Syncing will proceed automatically.
              </p>
            </div>
          </div>

          <button
            onClick={() => void syncNow()}
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-black text-white shadow-xs hover:bg-teal-700 active:scale-95 transition-all"
          >
            <RefreshCw className="h-3 w-3" />
            Sync Now
          </button>
        </div>
      )}

      {/* 4. Sync Success Banner */}
      {isOnline && !isSyncing && pendingCount === 0 && !dismissed && Boolean(lastSyncedAt) && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">

          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-black text-emerald-950 dark:text-emerald-100">
                All offline entries synchronised
              </p>
              <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80">
                Your vitals, drains, and symptoms are fully updated in your medical record.
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-[11px] font-bold text-emerald-700 hover:underline dark:text-emerald-300"
          >
            Dismiss
          </button>


        </div>
      )}
    </div>
  );
}
