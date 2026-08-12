"use client";
import { WonFlowErrorState } from "@/components/feedback/async-data-state";
export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) { return <main className="mx-auto max-w-3xl px-4 py-6"><WonFlowErrorState title="Unable to load cancellation" onRetry={reset} /></main>; }
