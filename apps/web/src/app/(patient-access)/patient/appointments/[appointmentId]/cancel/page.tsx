import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { PatientAppointmentCancellationScreen } from "@/components/appointments/patient-appointment-cancellation-screen";
import { loadPatientAppointmentDetails } from "@/lib/patient/patient-appointment-details.server";
import { createPatientAppointmentPageMetadata } from "@/lib/patient/patient-appointment-page-metadata";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
export const metadata = createPatientAppointmentPageMetadata("Cancel appointment");
export default async function CancelPage({ params }: { params: Promise<{ appointmentId: string }> }) { const details = await loadPatientAppointmentDetails((await params).appointmentId); if (!details) notFound(); return <PatientAppointmentCancellationScreen details={details} submissionId={randomUUID()} />; }
