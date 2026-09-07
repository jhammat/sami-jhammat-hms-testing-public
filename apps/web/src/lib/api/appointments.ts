import { apiGet, apiPatch, apiPost } from "./client";
import { resourceTags } from "./cache";
import { useApiMutation } from "./use-api-mutation";
import { useApiResource } from "./use-api-resource";
import type { UseApiResourceResult } from "./use-api-resource";
import type { UseApiMutationResult } from "./use-api-mutation";

/**
 * The appointment directory, booking, rescheduling, cancellation and
 * check-in data-access layer. Slot generation and availability are always
 * a server computation (GET /api/v1/appointments?slots=1) — nothing here
 * generates a bookable time in the browser.
 */

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_QUEUE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface AppointmentPatientSummary {
  id: string;
  patientNumber: string;
  givenName: string;
  middleName: string | null;
  familyName: string;
  phone: string | null;
  identifiers: readonly { type: string; value: string; isPrimary: boolean }[];
}

export interface AppointmentDoctorSummary {
  id: string;
  specialty: string | null;
  staffProfile: { membership: { displayName: string } };
}

export interface AppointmentServiceSummary {
  id: string;
  name: string;
  durationMinutes: number;
  priceMinorUnits: number | null;
  currencyCode: string;
}

export interface AppointmentRecord {
  id: string;
  patientId: string;
  doctorId: string | null;
  branchId: string;
  serviceId: string | null;
  status: AppointmentStatus;
  consultationMode: string;
  source: string;
  reason: string | null;
  startsAt: string;
  endsAt: string;
  checkedInAt: string | null;
  tokenNumber: number | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  patient: AppointmentPatientSummary;
  doctor: AppointmentDoctorSummary | null;
  service: AppointmentServiceSummary | null;
}

export interface ListAppointmentsQuery {
  query?: string;
  branchId?: string;
  practitionerId?: string;
  status?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sort?: "time-ascending" | "time-descending";
}

export interface ListAppointmentsSummary {
  total: number;
  booked: number;
  checkedIn: number;
  completed: number;
  cancelled: number;
}

export interface ListAppointmentsResult {
  appointments: AppointmentRecord[];
  total: number;
  page: number;
  pageSize: number;
  summary: ListAppointmentsSummary;
}

export interface AppointmentSlot {
  start: string;
  end: string;
  label: string;
  available: boolean;
  startsAt: string;
  endsAt: string;
  /** Consulting room from the doctor's sitting; null until they record one. */
  roomLabel: string | null;
}

export interface AppointmentSlotsResult {
  slots: AppointmentSlot[];
  slotMinutes: number;
  unavailableReason?: string;
}

export interface ListAppointmentSlotsQuery {
  doctorId: string;
  branchId: string;
  date: string;
  durationMinutes?: number;
}

export interface BookAppointmentInput {
  patientId: string;
  doctorId?: string;
  serviceId?: string;
  branchId?: string;
  startsAt: string;
  endsAt: string;
  reason?: string;
  source: string;
  idempotencyKey: string;
  /**
   * Set when reception asks "online or in person?" on the phone. Omitted, the
   * server keeps using the service's own mode. Rejected server-side if it
   * contradicts a service that is only offered one way.
   */
  consultationMode?: "IN_PERSON" | "ONLINE";
}

export interface RescheduleAppointmentInput {
  startsAt: string;
  endsAt: string;
}

export interface CheckInAppointmentInput {
  queueDate: string;
  priority?: number;
  notes?: string;
  branchId?: string;
}

const APPOINTMENTS_TAG = "appointments";

function appointmentTag(appointmentId: string): string {
  return resourceTags(APPOINTMENTS_TAG, appointmentId)[1];
}

export function listAppointments(query: ListAppointmentsQuery, signal?: AbortSignal): Promise<ListAppointmentsResult> {
  return apiGet<ListAppointmentsResult>("/api/v1/appointments", {
    query: {
      query: query.query,
      branchId: query.branchId,
      practitionerId: query.practitionerId,
      status: query.status,
      date: query.date,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
    },
    signal,
  });
}

/** The server-computed slots for a doctor/branch/date. Never generate a slot list in the browser. */
export function listAppointmentSlots(query: ListAppointmentSlotsQuery, signal?: AbortSignal): Promise<AppointmentSlotsResult> {
  return apiGet<AppointmentSlotsResult>("/api/v1/appointments", {
    query: {
      slots: "1",
      doctorId: query.doctorId,
      branchId: query.branchId,
      date: query.date,
      durationMinutes: query.durationMinutes,
    },
    signal,
  });
}

export function bookAppointment(input: BookAppointmentInput): Promise<{ appointment: AppointmentRecord }> {
  return apiPost<{ appointment: AppointmentRecord }, BookAppointmentInput>("/api/v1/appointments", input);
}

export function rescheduleAppointment(appointmentId: string, input: RescheduleAppointmentInput): Promise<{ appointment: AppointmentRecord }> {
  return apiPatch<{ appointment: AppointmentRecord }, RescheduleAppointmentInput & { action: "reschedule" }>(`/api/v1/appointments/${appointmentId}`, {
    ...input,
    action: "reschedule",
  });
}

export function cancelAppointment(appointmentId: string, reason: string): Promise<{ appointment: AppointmentRecord }> {
  return apiPatch<{ appointment: AppointmentRecord }, { action: "cancel"; reason: string }>(`/api/v1/appointments/${appointmentId}`, {
    action: "cancel",
    reason,
  });
}

export function checkInAppointment(appointmentId: string, input: CheckInAppointmentInput): Promise<{ appointment: AppointmentRecord; queueEntry: unknown }> {
  return apiPost<{ appointment: AppointmentRecord; queueEntry: unknown }, CheckInAppointmentInput>(`/api/v1/appointments/${appointmentId}/check-in`, input);
}

/** The read side: paginated, server-filtered, cached under the "appointments" tag and revalidated automatically after booking/reschedule/cancel/check-in. */
export function useAppointments(query: ListAppointmentsQuery): UseApiResourceResult<ListAppointmentsResult> {
  return useApiResource<ListAppointmentsResult>({
    key: `appointments:${JSON.stringify(query)}`,
    tags: [APPOINTMENTS_TAG],
    fetcher: (signal) => listAppointments(query, signal),
    isEmpty: (result) => result.appointments.length === 0,
  });
}

export function useBookAppointment(): UseApiMutationResult<{ appointment: AppointmentRecord }, BookAppointmentInput> {
  return useApiMutation((input: BookAppointmentInput) => bookAppointment(input), {
    invalidates: resourceTags(APPOINTMENTS_TAG),
  });
}

export function useRescheduleAppointment(): UseApiMutationResult<{ appointment: AppointmentRecord }, { appointmentId: string; input: RescheduleAppointmentInput }> {
  return useApiMutation(({ appointmentId, input }: { appointmentId: string; input: RescheduleAppointmentInput }) => rescheduleAppointment(appointmentId, input), {
    invalidates: ({ appointmentId }) => [APPOINTMENTS_TAG, appointmentTag(appointmentId)],
  });
}

export function useCancelAppointment(): UseApiMutationResult<{ appointment: AppointmentRecord }, { appointmentId: string; reason: string }> {
  return useApiMutation(({ appointmentId, reason }: { appointmentId: string; reason: string }) => cancelAppointment(appointmentId, reason), {
    invalidates: ({ appointmentId }) => [APPOINTMENTS_TAG, appointmentTag(appointmentId)],
  });
}

export function useCheckInAppointment(): UseApiMutationResult<{ appointment: AppointmentRecord; queueEntry: unknown }, { appointmentId: string; input: CheckInAppointmentInput }> {
  return useApiMutation(({ appointmentId, input }: { appointmentId: string; input: CheckInAppointmentInput }) => checkInAppointment(appointmentId, input), {
    invalidates: ({ appointmentId }) => [APPOINTMENTS_TAG, appointmentTag(appointmentId)],
  });
}
