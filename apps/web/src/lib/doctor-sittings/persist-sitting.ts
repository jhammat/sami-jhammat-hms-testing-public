import type { DemoDoctorSittingStatus } from "./sittings";

/**
 * Bridges the doctor portal's sitting controls to the tenant database.
 *
 * The portal's local records drive the demo queue, but reception and the
 * patient portal resolve bookable slots from `DoctorSitting` rows on the
 * server. Without this write-through, a doctor's actual hours never leave
 * their browser and every other user still sees the hospital roster.
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

/** Server id for a persisted sitting, keyed by the local record's id. */
const serverIdByLocalId = new Map<string, string>();

export function rememberServerSittingId(localId: string, serverId: string): void {
  serverIdByLocalId.set(localId, serverId);
}

export function getServerSittingId(localId: string): string | undefined {
  return serverIdByLocalId.get(localId);
}

/**
 * Writes the sitting to the database. Resolves to an error string when the
 * write fails so the caller can surface it; never throws.
 */
export async function persistDoctorSitting(input: {
  localId: string;
  branchId: string;
  businessDate: string;
  sittingStartTime: string;
  sittingEndTime: string;
  averageConsultationMinutes: number;
  roomLabel: string;
  status: DemoDoctorSittingStatus;
}): Promise<string | undefined> {
  try {
    const response = await fetch("/api/v1/doctor/sittings", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId: input.branchId,
        businessDate: input.businessDate,
        startsMinute: timeToMinute(input.sittingStartTime),
        endsMinute: timeToMinute(input.sittingEndTime),
        averageConsultationMinutes: input.averageConsultationMinutes,
        roomLabel: input.roomLabel,
        status: STATUS_MAP[input.status],
      }),
    });
    const body = await response.json().catch(() => ({})) as { error?: string; sitting?: { id: string } };
    if (!response.ok) {
      return body.error ?? "Your sitting was saved locally but could not be published to reception.";
    }
    if (body.sitting?.id) rememberServerSittingId(input.localId, body.sitting.id);
    return undefined;
  } catch {
    return "Your sitting was saved locally but could not be published to reception.";
  }
}

/** Publishes a status change (arrived, on break, finished) to the database. */
export async function persistDoctorSittingStatus(
  localId: string,
  status: DemoDoctorSittingStatus,
): Promise<string | undefined> {
  const serverId = serverIdByLocalId.get(localId);
  if (serverId === undefined) {
    return "This sitting is not published to reception yet. Save it again to publish.";
  }
  try {
    const response = await fetch(`/api/v1/doctor/sittings/${encodeURIComponent(serverId)}/status`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: STATUS_MAP[status] }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string };
      return body.error ?? "The status changed locally but could not be published to reception.";
    }
    return undefined;
  } catch {
    return "The status changed locally but could not be published to reception.";
  }
}
