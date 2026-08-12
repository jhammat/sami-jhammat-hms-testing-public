export type PatientAppointmentMutationStatus = "idle" | "error" | "stale";
export interface PatientAppointmentMutationState { status: PatientAppointmentMutationStatus; message?: string; fieldErrors?: { acknowledgement?: string; appointmentId?: string; offeringId?: string; slotId?: string }; }
export const initialPatientAppointmentMutationState: PatientAppointmentMutationState = { status: "idle" };
