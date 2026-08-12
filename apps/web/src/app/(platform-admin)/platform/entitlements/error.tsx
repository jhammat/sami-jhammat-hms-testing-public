"use client";

import { WonFlowErrorState } from "@/components/feedback/async-data-state";

export default function ErrorState({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="grid min-h-[60vh] place-items-center" id="main-content">
      <div className="w-full max-w-xl">
        <WonFlowErrorState
          description="No entitlement changes were made. You can retry loading this screen."
          onRetry={reset}
          title="Entitlements could not be loaded"
        />
      </div>
    </main>
  );
}
