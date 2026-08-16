import type { Metadata } from "next";
import { PatientAppointmentPaymentScreen } from "@/components/appointments/patient-appointment-payment-screen";

export const metadata: Metadata = { title: "Appointment payment | WonFlow", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PatientAppointmentPaymentPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  return <PatientAppointmentPaymentScreen appointmentId={appointmentId} />;
}
