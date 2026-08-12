export type DemoDoctorScheduleDay =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DemoDoctorSchedule {
  id: string;
  practitionerId: string;
  branchId: string;
  dayOfWeek: DemoDoctorScheduleDay;
  startTime: string;
  endTime: string;
  appointmentDurationMinutes: number;
  maximumPatients: number;
  allowWalkIns: boolean;
  preferredRoomId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SaveDemoDoctorScheduleInput = Omit<
  DemoDoctorSchedule,
  "id" | "createdAt" | "updatedAt"
> & { id?: string };

export const DOCTOR_SCHEDULES_CHANGED_EVENT =
  "wonflow:demo-doctor-schedules-changed";
const STORAGE_KEY = "wonflow-demo-doctor-schedules";

function isTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isSchedule(value: unknown): value is DemoDoctorSchedule {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<DemoDoctorSchedule>;
  return typeof item.id === "string" &&
    typeof item.practitionerId === "string" &&
    typeof item.branchId === "string" &&
    Number.isInteger(item.dayOfWeek) && Number(item.dayOfWeek) >= 0 && Number(item.dayOfWeek) <= 6 &&
    isTime(item.startTime) && isTime(item.endTime) &&
    Number.isInteger(item.appointmentDurationMinutes) &&
    Number(item.appointmentDurationMinutes) >= 5 &&
    Number(item.appointmentDurationMinutes) <= 120 &&
    Number.isInteger(item.maximumPatients) &&
    Number(item.maximumPatients) >= 1 &&
    typeof item.allowWalkIns === "boolean" && typeof item.active === "boolean" &&
    typeof item.createdAt === "string" && typeof item.updatedAt === "string";
}

export function readDemoDoctorSchedules(): DemoDoctorSchedule[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter(isSchedule) : [];
  } catch { return []; }
}

function writeSchedules(schedules: readonly DemoDoctorSchedule[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules.slice(0, 500)));
  window.dispatchEvent(new Event(DOCTOR_SCHEDULES_CHANGED_EVENT));
}

export function validateDemoDoctorSchedule(
  input: SaveDemoDoctorScheduleInput,
  schedules = readDemoDoctorSchedules(),
): string | undefined {
  if (input.startTime >= input.endTime) return "Start time must be before end time.";
  if (!Number.isInteger(input.appointmentDurationMinutes) || input.appointmentDurationMinutes < 5 || input.appointmentDurationMinutes > 120) return "Appointment duration must be a whole number between 5 and 120 minutes.";
  if (!Number.isInteger(input.maximumPatients) || input.maximumPatients < 1) return "Maximum patients must be a positive whole number.";
  const overlaps = schedules.some((item) => item.id !== input.id && item.active && input.active &&
    item.practitionerId === input.practitionerId && item.dayOfWeek === input.dayOfWeek &&
    input.startTime < item.endTime && input.endTime > item.startTime);
  return overlaps ? "This schedule overlaps another active block for the same day." : undefined;
}

export function saveDemoDoctorSchedule(input: SaveDemoDoctorScheduleInput): DemoDoctorSchedule {
  const schedules = readDemoDoctorSchedules();
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
  writeSchedules([record, ...schedules.filter((item) => item.id !== record.id)]);
  return record;
}

export function deleteDemoDoctorSchedule(id: string): void {
  writeSchedules(readDemoDoctorSchedules().filter((item) => item.id !== id));
}

export function setDemoDoctorScheduleActive(id: string, active: boolean): void {
  const timestamp = new Date().toISOString();
  writeSchedules(readDemoDoctorSchedules().map((item) => item.id === id ? { ...item, active, updatedAt: timestamp } : item));
}
