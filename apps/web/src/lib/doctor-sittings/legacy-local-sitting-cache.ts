import type { DemoDoctorSitting, DemoDoctorSittingStatus, SaveDemoDoctorSittingInput } from "./sittings";

/**
 * Compatibility cache for doctor-portal screens not yet wired to the real
 * sitting endpoints (apps/web/src/lib/doctor-sittings/persist-sitting.ts
 * already writes real sittings through to /api/v1/doctor/sittings; this
 * cache only backs the older, still-local read helpers a few screens use
 * for display). Not localStorage, never primed, always starts empty —
 * exists only so those screens keep compiling and degrade to "no data"
 * instead of reintroducing localStorage.
 */

export const DOCTOR_SITTINGS_CHANGED_EVENT = "wonflow:demo-doctor-sittings-changed";

let sittings: DemoDoctorSitting[] = [];

function createIdentifier(): string {
  return `doctor-sitting-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function readDemoDoctorSittings(): DemoDoctorSitting[] {
  return sittings;
}

export function writeDemoDoctorSittings(next: readonly DemoDoctorSitting[]): void {
  sittings = next.slice(0, 500);
}

export function getDemoDoctorSitting(input: { practitionerId: string; branchId: string; businessDate: string }): DemoDoctorSitting | undefined {
  return sittings.find((sitting) => sitting.practitionerId === input.practitionerId && sitting.branchId === input.branchId && sitting.businessDate === input.businessDate);
}

export function getActiveDemoDoctorSitting(input: { practitionerId: string; branchId: string; businessDate: string }): DemoDoctorSitting | undefined {
  const sitting = getDemoDoctorSitting(input);
  return sitting === undefined || sitting.status === "finished" || sitting.status === "not-started" ? undefined : sitting;
}

export function saveDemoDoctorSitting(input: SaveDemoDoctorSittingInput): DemoDoctorSitting {
  const existingSitting = sittings.find((sitting) => sitting.practitionerId === input.practitionerId && sitting.branchId === input.branchId && sitting.businessDate === input.businessDate);
  const timestamp = new Date().toISOString();
  const averageConsultationMinutes = Math.min(120, Math.max(5, input.averageConsultationMinutes));
  const sitting: DemoDoctorSitting = {
    id: existingSitting?.id ?? createIdentifier(),
    practitionerId: input.practitionerId,
    branchId: input.branchId,
    businessDate: input.businessDate,
    roomId: input.roomId,
    roomLabel: input.roomLabel,
    sittingStartTime: input.sittingStartTime,
    sittingEndTime: input.sittingEndTime,
    averageConsultationMinutes,
    status: input.status ?? existingSitting?.status ?? "not-started",
    actualStartedAt: existingSitting?.actualStartedAt,
    actualEndedAt: existingSitting?.actualEndedAt,
    createdAt: existingSitting?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  sittings = [sitting, ...sittings.filter((record) => record.id !== sitting.id)];
  return sitting;
}

export function updateDemoDoctorSittingStatus(sittingId: string, status: DemoDoctorSittingStatus): DemoDoctorSitting | undefined {
  const existingSitting = sittings.find((sitting) => sitting.id === sittingId);
  if (existingSitting === undefined) return undefined;
  const updatedSitting: DemoDoctorSitting = {
    ...existingSitting,
    status,
    actualStartedAt: status === "available" && existingSitting.actualStartedAt === undefined ? new Date().toISOString() : existingSitting.actualStartedAt,
    actualEndedAt: status === "finished" ? new Date().toISOString() : existingSitting.actualEndedAt,
    updatedAt: new Date().toISOString(),
  };
  sittings = sittings.map((sitting) => (sitting.id === sittingId ? updatedSitting : sitting));
  return updatedSitting;
}
