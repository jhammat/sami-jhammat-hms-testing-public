"use client";

import { DoctorAppointmentsPanel } from "@/components/doctor/doctor-portal-workflow";

/**
 * The doctor's appointment schedule and patient queue.
 *
 * This screen had no page of its own and was reached through the `[section]`
 * catch-all beside it. That only worked while nothing else claimed the
 * segment: `doctor/appointments/[appointmentId]/video` made `appointments` a
 * real route directory, and the App Router matches a static segment in
 * preference to a dynamic sibling without falling back — so `/doctor/appointments`,
 * which the sidebar links to, resolved to a directory with no page and 404ed.
 *
 * Owning the segment explicitly is what makes the link work, and keeps the
 * route from depending on which of its children happen to exist.
 */
export default function DoctorAppointmentsPage() {
  return <DoctorAppointmentsPanel />;
}
