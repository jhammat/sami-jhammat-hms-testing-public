"use client";
import { WonFlowErrorState } from "@/components/feedback/async-data-state";
export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) { return <main id="main-content" className="mx-auto max-w-4xl px-4 py-6"><WonFlowErrorState title="Unable to load booking" onRetry={reset} /></main>; }
