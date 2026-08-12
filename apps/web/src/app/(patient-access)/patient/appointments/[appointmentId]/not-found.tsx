import Link from "next/link";
import { WonFlowEmptyState } from "@/components/feedback/async-data-state";
import { PATIENT_APPOINTMENTS_PATH } from "@/lib/patient/patient-appointment-paths";
export default function NotFound() { return <main id="main-content" className="mx-auto w-full max-w-4xl overflow-x-clip px-4 py-6"><WonFlowEmptyState title="Appointment unavailable" description="The appointment could not be found or is not available to this account." action={<Link className="inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white motion-reduce:transition-none" href={PATIENT_APPOINTMENTS_PATH}>Return to appointments</Link>} /></main>; }
