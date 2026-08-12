export type DemoDoctorSittingStatus =
  | "not-started"
  | "available"
  | "on-break"
  | "finished";

export interface DemoDoctorSitting {
  id: string;
  practitionerId: string;
  branchId: string;
  businessDate: string;
  roomId: string;
  roomLabel: string;
  sittingStartTime: string;
  sittingEndTime: string;
  averageConsultationMinutes: number;
  status: DemoDoctorSittingStatus;
  actualStartedAt?: string;
  actualEndedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveDemoDoctorSittingInput {
  practitionerId: string;
  branchId: string;
  businessDate: string;
  roomId: string;
  roomLabel: string;
  sittingStartTime: string;
  sittingEndTime: string;
  averageConsultationMinutes: number;
  status?: DemoDoctorSittingStatus;
}

const STORAGE_KEY = "wonflow-demo-doctor-sittings";

export const DOCTOR_SITTINGS_CHANGED_EVENT =
  "wonflow:demo-doctor-sittings-changed";

function createIdentifier(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `doctor-sitting-${globalThis.crypto.randomUUID()}`;
  }

  return [
    "doctor-sitting",
    Date.now(),
    Math.random().toString(36).slice(2),
  ].join("-");
}

export function readDemoDoctorSittings(): DemoDoctorSitting[] {
  if (typeof window === "undefined") {
    return [];
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);

  if (storedValue === null) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) return [];
    return parsedValue.filter((value): value is DemoDoctorSitting => {
      if (typeof value !== "object" || value === null) return false;
      const sitting = value as Partial<DemoDoctorSitting>;
      return typeof sitting.id === "string" &&
        typeof sitting.practitionerId === "string" &&
        typeof sitting.branchId === "string" &&
        typeof sitting.businessDate === "string" &&
        typeof sitting.roomId === "string" &&
        typeof sitting.roomLabel === "string" &&
        typeof sitting.sittingStartTime === "string" &&
        typeof sitting.sittingEndTime === "string" &&
        typeof sitting.averageConsultationMinutes === "number" &&
        ["not-started", "available", "on-break", "finished"].includes(sitting.status ?? "") &&
        typeof sitting.createdAt === "string" && typeof sitting.updatedAt === "string";
    });
  } catch {
    return [];
  }
}

export function writeDemoDoctorSittings(
  sittings: readonly DemoDoctorSitting[],
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(sittings.slice(0, 500)),
  );
  window.dispatchEvent(
    new Event(DOCTOR_SITTINGS_CHANGED_EVENT),
  );
}

export function getDemoDoctorSitting(input: {
  practitionerId: string;
  branchId: string;
  businessDate: string;
}): DemoDoctorSitting | undefined {
  return readDemoDoctorSittings().find(
    (sitting) =>
      sitting.practitionerId === input.practitionerId &&
      sitting.branchId === input.branchId &&
      sitting.businessDate === input.businessDate,
  );
}

export function getActiveDemoDoctorSitting(input: {
  practitionerId: string;
  branchId: string;
  businessDate: string;
}): DemoDoctorSitting | undefined {
  const sitting = getDemoDoctorSitting(input);
  return sitting === undefined ||
    sitting.status === "finished" ||
    sitting.status === "not-started"
    ? undefined
    : sitting;
}

export function saveDemoDoctorSitting(
  input: SaveDemoDoctorSittingInput,
): DemoDoctorSitting {
  const sittings = readDemoDoctorSittings();
  const existingSitting = sittings.find(
    (sitting) =>
      sitting.practitionerId === input.practitionerId &&
      sitting.branchId === input.branchId &&
      sitting.businessDate === input.businessDate,
  );
  const timestamp = new Date().toISOString();
  const averageConsultationMinutes = Math.min(
    120,
    Math.max(5, input.averageConsultationMinutes),
  );
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
    status:
      input.status ?? existingSitting?.status ?? "not-started",
    actualStartedAt: existingSitting?.actualStartedAt,
    actualEndedAt: existingSitting?.actualEndedAt,
    createdAt: existingSitting?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  writeDemoDoctorSittings([
    sitting,
    ...sittings.filter((record) => record.id !== sitting.id),
  ]);
  return sitting;
}

export function updateDemoDoctorSittingStatus(
  sittingId: string,
  status: DemoDoctorSittingStatus,
): DemoDoctorSitting | undefined {
  const sittings = readDemoDoctorSittings();
  const existingSitting = sittings.find(
    (sitting) => sitting.id === sittingId,
  );

  if (existingSitting === undefined) {
    return undefined;
  }

  const updatedSitting: DemoDoctorSitting = {
    ...existingSitting,
    status,
    actualStartedAt:
      status === "available" && existingSitting.actualStartedAt === undefined
        ? new Date().toISOString()
        : existingSitting.actualStartedAt,
    actualEndedAt:
      status === "finished" ? new Date().toISOString() : existingSitting.actualEndedAt,
    updatedAt: new Date().toISOString(),
  };
  writeDemoDoctorSittings(
    sittings.map((sitting) =>
      sitting.id === sittingId ? updatedSitting : sitting,
    ),
  );
  return updatedSitting;
}
