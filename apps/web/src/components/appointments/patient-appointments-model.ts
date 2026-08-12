export type PatientAppointmentGroup = "upcoming" | "previous";
export type PatientAppointmentStatusTone = "neutral" | "info" | "positive" | "warning" | "negative";
export interface PatientAppointmentStatusView { label: string; tone: PatientAppointmentStatusTone; }
export interface PatientAppointmentCardView {
  id: string; group: PatientAppointmentGroup; serviceName: string; clinicianName?: string; locationName?: string;
  startsAt: string; endsAt?: string; dateLabel: string; timeLabel: string; timeZoneLabel: string;
  status: PatientAppointmentStatusView; visitFormatLabel?: string; preparationSummary?: string; detailsHref?: string;
}
export interface PatientAppointmentsScreenView { upcomingAppointments: PatientAppointmentCardView[]; previousAppointments: PatientAppointmentCardView[]; bookingHref?: string; }
const terms: Record<PatientAppointmentStatusTone, readonly string[]> = {
  negative: ["cancelled", "canceled", "declined", "no show", "no-show"], warning: ["pending", "requested", "waiting", "rescheduled"],
  positive: ["confirmed", "completed", "checked in"], info: ["scheduled", "upcoming", "in progress"], neutral: [],
};
export function resolvePatientAppointmentStatus(value?: string | null): PatientAppointmentStatusView {
  const label = value?.trim() || "Status unavailable"; const normalized = label.toLocaleLowerCase();
  for (const tone of ["negative", "warning", "positive", "info"] as const) if (terms[tone].some((term) => normalized.includes(term))) return { label, tone };
  return { label, tone: "neutral" };
}
function compare(left: string, right: string) { const l = new Date(left).getTime(); const r = new Date(right).getTime(); return Number.isNaN(l) || Number.isNaN(r) ? left.localeCompare(right) : l - r; }
export function partitionPatientAppointments(appointments: readonly PatientAppointmentCardView[]) {
  return {
    upcomingAppointments: appointments.filter((item) => item.group === "upcoming").sort((a, b) => compare(a.startsAt, b.startsAt)),
    previousAppointments: appointments.filter((item) => item.group === "previous").sort((a, b) => compare(b.startsAt, a.startsAt)),
  };
}
