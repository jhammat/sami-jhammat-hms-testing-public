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
          description="No audit records were changed. You can retry loading the audit trail."
          onRetry={reset}
          title="Platform audit could not be loaded"
        />
      </div>
    </main>
  );
}
