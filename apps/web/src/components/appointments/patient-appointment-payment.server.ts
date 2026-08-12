import "server-only";
import type { PatientAppointmentPaymentModel } from "./patient-appointment-payment-screen";
/** Payment remains unavailable until an authenticated patient-account context can be resolved server-side. */
export async function loadPatientAppointmentPayment(appointmentId:string):Promise<PatientAppointmentPaymentModel|undefined>{void appointmentId;return undefined}
