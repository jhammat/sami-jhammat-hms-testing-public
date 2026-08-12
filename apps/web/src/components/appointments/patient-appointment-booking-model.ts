import { normalizePatientAppointmentReasons } from "./patient-appointment-details-model";
import { sortPatientAppointmentSlots } from "./patient-appointment-slot-model";
import type { PatientAppointmentSlotView } from "./patient-appointment-slot-model";
export interface PatientAppointmentBookingOfferingView { id: string; serviceName: string; locationName: string; clinicianName?: string; visitFormatLabel?: string; preparationSummary?: string; locationTimeZone: string; slots: PatientAppointmentSlotView[]; }
export interface PatientAppointmentBookingView { availability: { available: boolean; unavailableReasons: string[] }; offerings: PatientAppointmentBookingOfferingView[]; appointmentsHref: string; }
export function createPatientAppointmentBookingAvailability(input: { available: boolean; unavailableReasons?: readonly (string|null|undefined)[] }) { return { available: input.available, unavailableReasons: normalizePatientAppointmentReasons(input.unavailableReasons ?? []) }; }
export function sortPatientAppointmentBookingOfferings(offerings: readonly PatientAppointmentBookingOfferingView[]) { return offerings.map((offering) => ({ ...offering, slots: sortPatientAppointmentSlots(offering.slots) })).sort((a,b) => a.serviceName.localeCompare(b.serviceName) || a.locationName.localeCompare(b.locationName)); }
