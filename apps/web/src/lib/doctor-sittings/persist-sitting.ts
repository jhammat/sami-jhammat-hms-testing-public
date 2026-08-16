import { mutate } from "@/lib/api/mutate";
import type { MutationResult } from "@/lib/api/mutate";

import type { DemoDoctorSittingStatus } from "./sittings";

/**
 * Writes the doctor's sitting to the real `DoctorSitting` table. Reception
 * and the patient portal resolve bookable slots from that table, not from
 * anything in this browser — so this is the only path that makes a sitting
 * visible to anyone else.
 *
 * There used to be a `serverIdByLocalId` module-level Map here, mapping a
 * locally-generated id to the server's real id so a later status change
 * could find the right row. It was deleted: the server's own sitting
 * record — fetched into `DoctorWorkflowModel.sitting` — already carries the
 * real database id (`toDemoDoctorSitting` in doctor-api.ts maps `id:
 * sitting.id` straight from the row), so there was never a reason to track
 * a second, browser-only id. That Map going empty on every page refresh is
 * exactly why Take Break and End Sitting stopped working after a reload:
 * the real id was sitting right there in server-fetched state the whole
 * time.
 */
const STATUS_MAP: Record<DemoDoctorSittingStatus, "PLANNED" | "AVAILABLE" | "ON_BREAK" | "FINISHED"> = {
  "not-started": "PLANNED",
  available: "AVAILABLE",
  "on-break": "ON_BREAK",
  finished: "FINISHED",
};

function timeToMinute(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

/** The real, full DoctorSitting row — the server returns this from both endpoints below, so a caller never has to guess a field it didn't receive. */
export interface PersistedSitting {
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

/** Creates or updates today's sitting. Resolves only once the server has confirmed the write. */
export async function persistDoctorSitting(input: {
  branchId: string;
  businessDate: string;
  sittingStartTime: string;
  sittingEndTime: string;
  averageConsultationMinutes: number;
  roomLabel: string;
  status: DemoDoctorSittingStatus;
}): Promise<MutationResult<{ sitting: PersistedSitting }>> {
  return mutate<{ sitting: PersistedSitting }>("/api/v1/doctor/sittings", {
    method: "PUT",
    body: {
      branchId: input.branchId,
      businessDate: input.businessDate,
      startsMinute: timeToMinute(input.sittingStartTime),
      endsMinute: timeToMinute(input.sittingEndTime),
      averageConsultationMinutes: input.averageConsultationMinutes,
      roomLabel: input.roomLabel,
      status: STATUS_MAP[input.status],
    },
    invalidates: ["doctor-sittings"],
  });
}

/** Publishes a status change (arrived, on break, finished) for an already-persisted sitting. `sittingId` must be the real server id. */
export async function persistDoctorSittingStatus(
  sittingId: string,
  status: DemoDoctorSittingStatus,
): Promise<MutationResult<{ sitting: PersistedSitting }>> {
  return mutate<{ sitting: PersistedSitting }>(`/api/v1/doctor/sittings/${encodeURIComponent(sittingId)}/status`, {
    method: "POST",
    body: { status: STATUS_MAP[status] },
    invalidates: ["doctor-sittings"],
  });
}
