import type { DemoAppointmentBooking, DemoAppointmentStatus } from "./booking";

/**
 * Compatibility cache for screens not yet wired to the live appointments
 * API (doctor consultation, clinical documentation, queue — tracked
 * separately). The appointment directory (FIX-06) reads and writes
 * PostgreSQL directly through @/lib/api/appointments; this in-memory cache
 * lets the remaining screens keep resolving "the appointment for this
 * queue entry" and marking one complete without reintroducing
 * localStorage. It is primed opportunistically whenever the directory
 * loads a page, and starts empty each session — the same cold-start
 * behaviour those screens already had when localStorage was empty.
 */

let cache: DemoAppointmentBooking[] = [];

export function primeLegacyAppointmentsCache(bookings: readonly DemoAppointmentBooking[]): void {
  cache = [...bookings];
}

export function readDemoAppointmentBookings(): DemoAppointmentBooking[] {
  return cache;
}

export function updateDemoAppointmentBookingStatus(
  bookingId: string,
  status: DemoAppointmentStatus,
): DemoAppointmentBooking | undefined {
  const existingBooking = cache.find((booking) => booking.id === bookingId);

  if (existingBooking === undefined) {
    return undefined;
  }

  const updatedBooking: DemoAppointmentBooking = { ...existingBooking, status };

  cache = cache.map((booking) => (booking.id === bookingId ? updatedBooking : booking));

  return updatedBooking;
}
