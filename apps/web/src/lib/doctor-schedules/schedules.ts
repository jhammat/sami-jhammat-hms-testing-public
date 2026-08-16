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

/** Overlap/duration validation, pure — no longer backed by a default localStorage read; pass the current schedule set explicitly. */
export function validateDemoDoctorSchedule(
  input: SaveDemoDoctorScheduleInput,
  schedules: readonly DemoDoctorSchedule[] = [],
): string | undefined {
  if (input.startTime >= input.endTime) return "Start time must be before end time.";
  if (!Number.isInteger(input.appointmentDurationMinutes) || input.appointmentDurationMinutes < 5 || input.appointmentDurationMinutes > 120) return "Appointment duration must be a whole number between 5 and 120 minutes.";
  if (!Number.isInteger(input.maximumPatients) || input.maximumPatients < 1) return "Maximum patients must be a positive whole number.";
  const overlaps = schedules.some((item) => item.id !== input.id && item.active && input.active &&
    item.practitionerId === input.practitionerId && item.dayOfWeek === input.dayOfWeek &&
    input.startTime < item.endTime && input.endTime > item.startTime);
  return overlaps ? "This schedule overlaps another active block for the same day." : undefined;
}
