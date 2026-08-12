"use client";
import { WonFlowErrorState } from "@/components/feedback/async-data-state";
export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="mx-auto max-w-4xl px-4 py-6"><WonFlowErrorState title="Unable to load appointment" description="We couldn’t retrieve this appointment. Please try again." onRetry={reset} /></main>; }
