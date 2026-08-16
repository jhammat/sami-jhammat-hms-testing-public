import type { DemoDoctorSchedule, SaveDemoDoctorScheduleInput } from "./schedules";
import { validateDemoDoctorSchedule } from "./schedules";

/**
 * Compatibility cache for the doctor portal's own weekly-schedule editor
 * (doctor-portal-workflow.tsx and friends), not yet wired to a real
 * doctor-facing schedule endpoint — tracked separately, since real
 * schedule management (AvailabilityRule) is an admin-only surface today
 * (see apps/web/src/components/organization/live-hospital-admin-pages.tsx,
 * already fully server-backed). This in-memory cache is not localStorage
 * and is never primed, so it always starts (and stays) empty until that
 * screen is wired to a real endpoint. It exists only so it keeps
 * compiling and degrades to "no data" instead of reintroducing
 * localStorage.
 */

export const DOCTOR_SCHEDULES_CHANGED_EVENT = "wonflow:demo-doctor-schedules-changed";

let schedules: DemoDoctorSchedule[] = [];

export function readDemoDoctorSchedules(): DemoDoctorSchedule[] {
  return schedules;
}

export function saveDemoDoctorSchedule(input: SaveDemoDoctorScheduleInput): DemoDoctorSchedule {
  const error = validateDemoDoctorSchedule(input, schedules);
  if (error !== undefined) throw new Error(error);
  const existing = schedules.find((item) => item.id === input.id);
  const timestamp = new Date().toISOString();
  const record: DemoDoctorSchedule = {
    ...input,
    id: existing?.id ?? `doctor-schedule-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  schedules = [record, ...schedules.filter((item) => item.id !== record.id)];
  return record;
}

export function deleteDemoDoctorSchedule(id: string): void {
  schedules = schedules.filter((item) => item.id !== id);
}

export function setDemoDoctorScheduleActive(id: string, active: boolean): void {
  const timestamp = new Date().toISOString();
  schedules = schedules.map((item) => (item.id === id ? { ...item, active, updatedAt: timestamp } : item));
}
