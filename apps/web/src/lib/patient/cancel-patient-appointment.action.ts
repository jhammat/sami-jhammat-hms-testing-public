"use server";
import type { PatientAppointmentMutationState } from "@/components/appointments/patient-appointment-mutation-model";
import { readPatientAppointmentFormIdentifier } from "@/lib/patient/patient-appointment-input.server";
export async function cancelPatientAppointmentAction(_previous: PatientAppointmentMutationState, formData: FormData): Promise<PatientAppointmentMutationState> { if (!readPatientAppointmentFormIdentifier(formData, "appointmentId")) return { status: "error", message: "The appointment could not be identified." }; return { status: "stale", message: "This appointment is no longer eligible for cancellation. Review the latest appointment details." }; }
