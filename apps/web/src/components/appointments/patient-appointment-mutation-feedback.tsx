import type { PatientAppointmentMutationState } from "./patient-appointment-mutation-model";
export function PatientAppointmentMutationFeedback({ state }: { state: PatientAppointmentMutationState }) { if (state.status === "idle") return null; return <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">{state.message ?? "Please try again."}</div>; }
