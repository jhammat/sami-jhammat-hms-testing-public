"use client";
import { WonFlowErrorState } from "@/components/feedback/async-data-state";
export default function PatientAppointmentsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="mx-auto w-full max-w-5xl px-4 py-6"><WonFlowErrorState title="Unable to load appointments" description="We couldn’t retrieve your appointments. Please try again." onRetry={reset} /></main>; }
