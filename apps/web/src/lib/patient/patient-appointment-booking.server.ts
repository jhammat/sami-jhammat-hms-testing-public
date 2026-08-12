import "server-only";
import { getWonFlowFrontendDataRuntime } from "@/lib/data/runtime";
import type { PatientAppointmentBookingView } from "@/components/appointments/patient-appointment-booking-model";
import { PATIENT_APPOINTMENTS_PATH } from "@/lib/patient/patient-appointment-paths";
export async function loadPatientAppointmentBooking(): Promise<PatientAppointmentBookingView> { const runtime = getWonFlowFrontendDataRuntime((await import("@/lib/config/public-app-config.server")).getWonFlowPublicAppConfiguration()); const tenant = await runtime.practiceTenant; void tenant.scope; return { availability: { available: false, unavailableReasons: ["Online appointment booking is not available for the current patient session."] }, offerings: [], appointmentsHref: PATIENT_APPOINTMENTS_PATH }; }
