"use client";

import { WifiOff } from "lucide-react";
import { useOfflineSyncStatus } from "@/lib/offline/indexed-db-outbox";

export function OfflineStatusBar() {
  const { isOnline, pendingCount } = useOfflineSyncStatus();

  // When online, never display any synchronising label or status banner at the top
  if (isOnline) {
    return null;
  }

  return (
    <div className="mb-4">
      {/* Offline Mode Banner - Only shown when genuinely disconnected */}
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
                ? `${pendingCount} entries saved locally on your device. They will automatically sync when connection returns.`
                : "You can keep logging vitals, drains, and symptoms. Records will be safely saved locally."}
            </p>
          </div>
        </div>

        <span className="rounded-xl bg-amber-200/60 px-2.5 py-1 text-[10px] font-black uppercase text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
          Offline Mode
        </span>
      </div>
    </div>
  );
}
