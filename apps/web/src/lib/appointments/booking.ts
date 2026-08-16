/**
 * The shared "appointment card" shape used by the read-only screens that
 * display appointment info (doctor consultation, clinical documentation,
 * queue). Booking, rescheduling, cancellation and check-in for the
 * appointment directory go through @/lib/api/appointments — see
 * docs/architecture/appointment-booking.md.
 */

export type AppointmentBookingSource =
  | "walk-in"
  | "phone"
  | "online"
  | "doctor-referral"
  | "hospital-referral";

export type AppointmentPriority =
  | "routine"
  | "urgent";

export type DemoAppointmentStatus =
  | "booked"
  | "checked-in"
  | "completed"
  | "cancelled"
  | "no-show";

export interface DemoAppointmentBooking {
  id: string;

  appointmentNumber: string;

  patientId: string;
  branchId: string;

  practitionerId: string;

  serviceId: string;
  serviceCode: string;
  serviceName: string;

  appointmentDate: string;

  slotStart: string;
  slotEnd: string;

  scheduledStartAt: string;
  scheduledEndAt: string;

  durationMinutes: number;

  feeMinorUnits: number;
  currencyCode: "PKR";

  reasonForVisit: string;

  source:
    AppointmentBookingSource;

  priority:
    AppointmentPriority;

  status:
    DemoAppointmentStatus;

  notes: string;

  createdAt: string;
}

function padNumber(
  value: number,
): string {
  return String(value)
    .padStart(2, "0");
}

export function getTodayDateInputValue():
  string {
  const currentDate =
    new Date();

  return [
    currentDate.getFullYear(),
    padNumber(
      currentDate.getMonth() +
        1,
    ),
    padNumber(
      currentDate.getDate(),
    ),
  ].join("-");
}
