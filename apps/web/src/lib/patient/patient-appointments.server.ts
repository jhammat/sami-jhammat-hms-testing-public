import "server-only";
import { getWonFlowFrontendDataRuntime } from "@/lib/data/runtime";
import { getWonFlowPublicAppConfiguration } from "@/lib/config/public-app-config.server";
import { partitionPatientAppointments } from "@/components/appointments/patient-appointments-model";
import { PATIENT_APPOINTMENT_BOOKING_PATH } from "@/lib/patient/patient-appointment-paths";
import type { PatientAppointmentsScreenView, PatientAppointmentCardView } from "@/components/appointments/patient-appointments-model";
export async function loadPatientAppointmentsScreen(): Promise<PatientAppointmentsScreenView> {
  const runtime = getWonFlowFrontendDataRuntime(getWonFlowPublicAppConfiguration()); const practiceTenant = await runtime.practiceTenant;
  // No authenticated patient-session resolver exists in this release. Do not guess an identity or expose tenant-owner data.
  void practiceTenant.scope;
  const appointments: PatientAppointmentCardView[] = [];
  return { ...partitionPatientAppointments(appointments), bookingHref: PATIENT_APPOINTMENT_BOOKING_PATH };
}
