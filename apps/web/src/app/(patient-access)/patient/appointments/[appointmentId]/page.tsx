import { notFound } from "next/navigation";
import { PatientAppointmentDetailsScreen } from "@/components/appointments/patient-appointment-details-screen";
import { loadPatientAppointmentDetails } from "@/lib/patient/patient-appointment-details.server";
import { createPatientAppointmentPageMetadata } from "@/lib/patient/patient-appointment-page-metadata";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = createPatientAppointmentPageMetadata("Appointment details");
export default async function PatientAppointmentDetailsPage({ params }: { params: Promise<{ appointmentId: string }> }) { const details = await loadPatientAppointmentDetails((await params).appointmentId); if (!details) notFound(); return <PatientAppointmentDetailsScreen details={details} />; }
