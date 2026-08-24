import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { database } from "@wonflow/database";
import { drainService } from "@/server/clinical/drain-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";
import type { RecordDrainLogInput } from "@wonflow/contracts";

async function resolvePatientAccess(
  rc: { tenantId?: string | null; identityId?: string | null; userId?: string | null },
  drainId: string,
) {
  if (!rc.tenantId) {
    throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
  }
  const idToMatch = rc.identityId || rc.userId;
  if (!idToMatch) {
    throw new WonFlowApiError(401, "unauthorized", "User identity is required.");
  }

  const drain = await database.patientDrain.findFirst({
    where: { id: drainId, tenantId: rc.tenantId },
  });

  if (!drain) {
    throw new WonFlowApiError(404, "drain-not-found", "Drain not found.");
  }

  const access = await database.patientAccess.findFirst({
    where: {
      identityId: idToMatch,
      patientId: drain.patientId,
      isActive: true,
    },
  });

  if (!access) {
    throw new WonFlowApiError(403, "forbidden", "You do not have permission to log output for this drain.");
  }

  return { drain, isCaregiver: access.relationship !== "self" };
}

export function POST(
  request: Request,
  { params }: { params: Promise<{ drainId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { drainId } = await params;
    await resolvePatientAccess(rc, drainId);

    const body = (await request.json().catch(() => ({}))) as RecordDrainLogInput;

    if (body.volumeMl === undefined || body.volumeMl === null || !body.colour) {
      throw new WonFlowApiError(400, "invalid-drain-log", "Volume (mL) and colour are required.");
    }

    const log = await drainService.recordDrainLog(rc, {
      ...body,
      drainId,
    });

    return NextResponse.json(log);
  });
}
