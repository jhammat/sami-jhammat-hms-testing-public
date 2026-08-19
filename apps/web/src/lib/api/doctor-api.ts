import { phaseOneApi } from "./phase-one-api";

import type { DemoDoctorSitting, DemoDoctorSittingStatus } from "@/lib/doctor-sittings";
import type { DemoQueueEntry, DemoQueuePriority, DemoQueueStatus } from "@/lib/queue";
import type { DemoClinicalEncounter, DemoClinicalEncounterStatus } from "@/lib/clinical";

export interface DoctorDashboardPatient {
  id: string;
  patientNumber: string;
  givenName: string;
  middleName: string | null;
  familyName: string;
  dateOfBirth: string | null;
  sex: string | null;
  phone: string | null;
}

export interface DoctorDashboardService {
  id: string;
  name: string;
}

export interface DoctorDashboardQueueEntry {
  id: string;
  tokenNumber: number;
  priority: number;
  status: "WAITING" | "CALLED" | "IN_SERVICE" | "COMPLETED" | "MISSED" | "CANCELLED";
  joinedAt: string;
  calledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
}

export interface DoctorDashboardEncounter {
  id: string;
  status: "PLANNED" | "IN_PROGRESS" | "PAUSED" | "COMPLETED" | "CANCELLED" | "ENTERED_IN_ERROR";
  reason: string | null;
  startedAt: string | null;
  endedAt: string | null;
  updatedAt: string;
}

export interface DoctorDashboardAppointment {
  id: string;
  branchId: string;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  startsAt: string;
  endsAt: string;
  reason: string | null;
  patient: DoctorDashboardPatient;
  service: DoctorDashboardService | null;
  queueEntry: DoctorDashboardQueueEntry | null;
  encounter: DoctorDashboardEncounter | null;
}

export interface DoctorDashboard {
  doctorId: string;
  appointments: DoctorDashboardAppointment[];
  metrics: { appointments: number; waiting: number; inProgress: number; completed: number };
}

export interface DoctorSittingRecord {
  id: string;
  doctorId: string;
  branchId: string;
  businessDate: string;
  startsMinute: number;
  endsMinute: number;
  averageConsultationMinutes: number;
  roomLabel: string | null;
  status: "PLANNED" | "AVAILABLE" | "ON_BREAK" | "FINISHED";
  actualStartedAt: string | null;
  actualEndedAt: string | null;
}

export interface DoctorSittingsResponse {
  doctorId: string;
  defaultBranchId: string | null;
  branches: { id: string; name: string; timezone: string }[];
  sittings: DoctorSittingRecord[];
  roster: { id: string; branch: { id: string; name: string }; weekday: number; startsMinute: number; endsMinute: number; capacity: number; serviceId: string | null }[];
}

export type DoctorQueueAction = "call" | "return" | "skip" | "start" | "complete";

export const getDoctorDashboard = (date: string) =>
  phaseOneApi<{ dashboard: DoctorDashboard }>(`/api/v1/doctor/dashboard?date=${encodeURIComponent(date)}`);

export const getDoctorSittings = (fromDate?: string) =>
  phaseOneApi<DoctorSittingsResponse>(`/api/v1/doctor/sittings${fromDate ? `?from=${encodeURIComponent(fromDate)}` : ""}`);

export const saveDoctorSitting = (input: {
  branchId: string;
  businessDate: string;
  startsMinute: number;
  endsMinute: number;
  averageConsultationMinutes?: number;
  roomLabel?: string | null;
  status?: "PLANNED" | "AVAILABLE" | "ON_BREAK" | "FINISHED";
}) => phaseOneApi<{ sitting: DoctorSittingRecord }>("/api/v1/doctor/sittings", { method: "PUT", body: JSON.stringify(input) });

export const setDoctorSittingStatus = (sittingId: string, status: "PLANNED" | "AVAILABLE" | "ON_BREAK" | "FINISHED") =>
  phaseOneApi<{ sitting: DoctorSittingRecord }>(`/api/v1/doctor/sittings/${sittingId}/status`, { method: "POST", body: JSON.stringify({ status }) });

export interface DoctorBranchRecord {
  id: string;
  name: string;
  code: string;
  timezone: string;
  isMainBranch: boolean;
}

export const createDoctorBranch = (input: {
  name: string;
  code?: string;
  phone?: string;
  email?: string;
  address?: string;
  timezone?: string;
  currencyCode?: string;
}) =>
  phaseOneApi<{ branch: DoctorBranchRecord }>("/api/v1/doctor/branches", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const patchDoctorQueue = (appointmentId: string, action: DoctorQueueAction) =>
  phaseOneApi<{ appointment: DoctorDashboardAppointment }>(`/api/v1/doctor/queue/${appointmentId}`, { method: "PATCH", body: JSON.stringify({ action }) });

export interface DoctorEncounterRecord {
  id: string;
  status: "PLANNED" | "IN_PROGRESS" | "PAUSED" | "COMPLETED" | "CANCELLED" | "ENTERED_IN_ERROR";
  appointmentId: string | null;
  patientId: string;
  startedAt: string | null;
  endedAt: string | null;
}

/** Creates the clinical encounter that starting a consultation requires — validated server-side against the same start-consultation readiness the UI checks before enabling the button. */
export const createDoctorEncounter = (appointmentId: string) =>
  phaseOneApi<{ encounter: DoctorEncounterRecord }>("/api/v1/doctor/encounters", { method: "POST", body: JSON.stringify({ appointmentId }) });

export const completeDoctorEncounter = (encounterId: string) =>
  phaseOneApi<{ encounter: DoctorEncounterRecord }>(`/api/v1/doctor/encounters/${encodeURIComponent(encounterId)}/complete`, { method: "POST" });

/** Pauses without releasing the patient — the appointment and queue entry stay in progress. */
export const pauseDoctorEncounter = (encounterId: string) =>
  phaseOneApi<{ encounter: DoctorEncounterRecord }>(`/api/v1/doctor/encounters/${encodeURIComponent(encounterId)}/pause`, { method: "POST" });

export const resumeDoctorEncounter = (encounterId: string) =>
  phaseOneApi<{ encounter: DoctorEncounterRecord }>(`/api/v1/doctor/encounters/${encodeURIComponent(encounterId)}/resume`, { method: "POST" });

export const cancelDoctorEncounter = (encounterId: string, reason: string) =>
  phaseOneApi<{ encounter: DoctorEncounterRecord }>(`/api/v1/doctor/encounters/${encodeURIComponent(encounterId)}/cancel`, { method: "POST", body: JSON.stringify({ reason }) });

/**
 * Adapters below translate real, database-backed dashboard/sitting responses
 * into the browser-local "Demo*" shapes the doctor portal UI already reads
 * (DemoQueueEntry, DemoDoctorSitting, DemoClinicalEncounter). This lets the
 * existing Today/Queue/Consultations screens keep working against a real
 * data source without a full UI rewrite, while the write side goes through
 * patchDoctorQueue instead of browser localStorage.
 */

const QUEUE_STATUS_MAP: Record<DoctorDashboardQueueEntry["status"], DemoQueueStatus> = {
  WAITING: "waiting",
  CALLED: "called",
  IN_SERVICE: "serving",
  COMPLETED: "completed",
  MISSED: "skipped",
  CANCELLED: "cancelled",
};

const SITTING_STATUS_MAP: Record<DoctorSittingRecord["status"], DemoDoctorSittingStatus> = {
  PLANNED: "not-started",
  AVAILABLE: "available",
  ON_BREAK: "on-break",
  FINISHED: "finished",
};

const ENCOUNTER_STATUS_MAP: Record<DoctorDashboardEncounter["status"], DemoClinicalEncounterStatus> = {
  PLANNED: "open",
  IN_PROGRESS: "in-consultation",
  PAUSED: "paused",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  ENTERED_IN_ERROR: "cancelled",
};

function priorityFromInt(priority: number): DemoQueuePriority {
  if (priority >= 2) return "emergency";
  if (priority === 1) return "urgent";
  return "routine";
}

function patientDisplayName(patient: DoctorDashboardPatient): string {
  return [patient.givenName, patient.middleName, patient.familyName].filter(Boolean).join(" ");
}

function calculateAgeFromDob(dateOfBirth: string | null): number {
  if (!dateOfBirth) return 0;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return Math.max(0, age);
}

function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Finds the sitting that applies to this doctor's queue for the given branch and business date. */
export function findActiveSitting(
  sittings: readonly DoctorSittingRecord[],
  branchId: string,
  businessDate: string,
): DoctorSittingRecord | undefined {
  const targetDate = businessDate.slice(0, 10);
  return (
    sittings.find((sitting) => {
      const sDate = String(sitting.businessDate).slice(0, 10);
      return (!branchId || sitting.branchId === branchId) && sDate === targetDate;
    }) ??
    sittings.find((sitting) => {
      const sDate = String(sitting.businessDate).slice(0, 10);
      return sDate === targetDate;
    })
  );
}

export function toDemoDoctorSitting(sitting: DoctorSittingRecord): DemoDoctorSitting {
  const sDate = String(sitting.businessDate).slice(0, 10);
  return {
    id: sitting.id,
    practitionerId: sitting.doctorId,
    branchId: sitting.branchId,
    businessDate: sDate,
    roomId: sitting.id,
    roomLabel: sitting.roomLabel ?? "Not assigned",
    sittingStartTime: minutesToTime(sitting.startsMinute),
    sittingEndTime: minutesToTime(sitting.endsMinute),
    averageConsultationMinutes: sitting.averageConsultationMinutes,
    status: SITTING_STATUS_MAP[sitting.status] ?? "not-started",
    actualStartedAt: sitting.actualStartedAt ?? undefined,
    actualEndedAt: sitting.actualEndedAt ?? undefined,
    createdAt: sitting.actualStartedAt ?? sDate,
    updatedAt: sitting.actualEndedAt ?? sitting.actualStartedAt ?? sDate,
  };
}

export function toDemoQueueEntry(
  appointment: DoctorDashboardAppointment,
  businessDate: string,
  doctorId: string,
  sitting: DoctorSittingRecord | undefined,
): DemoQueueEntry | undefined {
  const queueEntry = appointment.queueEntry;
  if (queueEntry === null) return undefined;

  return {
    id: queueEntry.id,
    tokenNumber: `Q-${String(queueEntry.tokenNumber).padStart(3, "0")}`,
    sequenceNumber: queueEntry.tokenNumber,
    businessDate,
    appointmentId: appointment.id,
    patientId: appointment.patient.id,
    branchId: appointment.branchId,
    practitionerId: doctorId,
    serviceName: appointment.service?.name ?? "Consultation",
    priority: priorityFromInt(queueEntry.priority),
    status: QUEUE_STATUS_MAP[queueEntry.status],
    roomId: sitting?.id,
    roomLabel: sitting?.roomLabel ?? undefined,
    doctorSittingId: sitting?.id,
    averageConsultationMinutes: sitting?.averageConsultationMinutes,
    checkedInAt: queueEntry.joinedAt,
    calledAt: queueEntry.calledAt ?? undefined,
    serviceStartedAt: queueEntry.startedAt ?? undefined,
    completedAt: queueEntry.completedAt ?? undefined,
    skippedAt: queueEntry.status === "MISSED" ? queueEntry.completedAt ?? undefined : undefined,
    notes: queueEntry.notes ?? "",
    source: "reception-desk",
    sourceReference: appointment.id,
    snapshot: {
      patient: {
        displayName: patientDisplayName(appointment.patient),
        mrNumber: appointment.patient.patientNumber,
        identityType: "",
        identityNumber: "",
        mobileNumber: appointment.patient.phone ?? "",
        gender: appointment.patient.sex ?? "unknown",
        ageYears: calculateAgeFromDob(appointment.patient.dateOfBirth),
        dateOfBirth: appointment.patient.dateOfBirth ?? "",
        ageIsEstimated: false,
        bloodGroup: "",
        allergies: "",
        medicalAlert: "",
      },
      practitioner: { displayName: "", specialtyName: "" },
      visit: {
        purpose: "OPD Walk-in",
        consultationType: appointment.service?.name ?? "Consultation",
        reasonForVisit: appointment.reason ?? "",
        appointmentDate: businessDate,
        appointmentTime: "",
        services: appointment.service ? [{ id: appointment.service.id, name: appointment.service.name, category: "", price: 0 }] : [],
      },
      billing: {
        currencyCode: "PKR",
        subtotal: 0,
        discount: 0,
        total: 0,
        received: 0,
        balance: 0,
        change: 0,
        paymentMethod: "",
        paymentStatus: "unpaid",
      },
    },
  };
}

export function toDemoClinicalEncounter(
  appointment: DoctorDashboardAppointment,
  doctorId: string,
): DemoClinicalEncounter | undefined {
  const encounter = appointment.encounter;
  if (encounter === null || appointment.queueEntry === null) return undefined;

  return {
    id: encounter.id,
    encounterNumber: `ENC-${encounter.id.slice(0, 8).toUpperCase()}`,
    encounterType: "outpatient",
    status: ENCOUNTER_STATUS_MAP[encounter.status],
    patientId: appointment.patient.id,
    branchId: appointment.branchId,
    practitionerId: doctorId,
    appointmentId: appointment.id,
    queueEntryId: appointment.queueEntry.id,
    serviceName: appointment.service?.name ?? "Consultation",
    reasonForVisit: encounter.reason ?? appointment.reason ?? "",
    openingNote: "",
    createdAt: encounter.startedAt ?? encounter.updatedAt,
    startedAt: encounter.startedAt ?? encounter.updatedAt,
    updatedAt: encounter.updatedAt,
    completedAt: encounter.endedAt ?? undefined,
    cancelledAt: encounter.status === "CANCELLED" ? encounter.updatedAt : undefined,
  };
}
