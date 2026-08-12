import "server-only";
import { getWonFlowFrontendDataRuntime } from "@/lib/data/runtime";
import type { PatientAppointmentDetailsView } from "@/components/appointments/patient-appointment-details-model";
export async function loadPatientAppointmentDetails(appointmentId: string): Promise<PatientAppointmentDetailsView | null> { const runtime = getWonFlowFrontendDataRuntime((await import("@/lib/config/public-app-config.server")).getWonFlowPublicAppConfiguration()); const tenant = await runtime.practiceTenant; void tenant.scope; void appointmentId; return null; }
