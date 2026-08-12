export const PATIENT_APPOINTMENTS_PATH = "/patient/appointments";
export const PATIENT_APPOINTMENT_BOOKING_PATH = `${PATIENT_APPOINTMENTS_PATH}/book`;
export const PATIENT_HOME_PATH = "/patient";
export const PATIENT_DOCUMENTS_PATH = `${PATIENT_HOME_PATH}/documents`;
export const PATIENT_DOCUMENT_UPLOAD_PATH = `${PATIENT_DOCUMENTS_PATH}/upload`;
export const PATIENT_MESSAGES_PATH = `${PATIENT_HOME_PATH}/messages`;
const encode = (value: string) => encodeURIComponent(value);
export function createPatientAppointmentDetailsPath(id: string) { return `${PATIENT_APPOINTMENTS_PATH}/${encode(id)}`; }
export function createPatientAppointmentCancellationPath(id: string) { return `${createPatientAppointmentDetailsPath(id)}/cancel`; }
export function createPatientAppointmentReschedulePath(id: string) { return `${createPatientAppointmentDetailsPath(id)}/reschedule`; }
export function createPatientAppointmentPaymentPath(id: string) { return `${createPatientAppointmentDetailsPath(id)}/payment`; }
export function createPatientAppointmentSuccessPath(id: string, notice: "booked" | "cancelled" | "rescheduled") { return `${createPatientAppointmentDetailsPath(id)}?notice=${encodeURIComponent(notice)}`; }
export function createPatientDocumentPath(id: string) { return `${PATIENT_DOCUMENTS_PATH}/${encode(id)}`; }
export function createPatientDocumentUploadPath(options?: { requestId?: string; returnTo?: string }) {
  const parameters = new URLSearchParams();
  if (options?.requestId !== undefined) parameters.set("requestId", options.requestId);
  if (options?.returnTo !== undefined) parameters.set("returnTo", options.returnTo);
  const query = parameters.toString();
  return query === "" ? PATIENT_DOCUMENT_UPLOAD_PATH : `${PATIENT_DOCUMENT_UPLOAD_PATH}?${query}`;
}
export function createPatientMessageThreadPath(id:string){return `${PATIENT_MESSAGES_PATH}/${encode(id)}`}
