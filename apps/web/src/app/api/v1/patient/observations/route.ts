import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { database } from "@wonflow/database";
import { observationService } from "@/server/clinical/observation-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";
import type { CreateObservationInput } from "@wonflow/contracts";

async function resolvePatientFromContext(rc: {
  tenantId?: string | null;
  identityId?: string | null;
  userId?: string | null;
}) {
  if (!rc.tenantId) {
    throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
  }
  const idToMatch = rc.identityId || rc.userId;
  if (!idToMatch) {
    throw new WonFlowApiError(401, "unauthorized", "User identity is required.");
  }

  const access = await database.patientAccess.findFirst({
    where: {
      identityId: idToMatch,
      isActive: true,
      patient: { tenantId: rc.tenantId },
    },
    include: { patient: true },
  });

  if (!access) {
    throw new WonFlowApiError(404, "patient-access-not-found", "No active patient access found.");
  }

  return {
    patient: access.patient,
    isCaregiver: access.relationship !== "self",
    relationship: access.relationship,
  };
}

export function GET(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { patient } = await resolvePatientFromContext(rc);
    const url = new URL(request.url);
    const code = url.searchParams.get("code") || undefined;
    const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined;

    const observations = await observationService.listPatientObservations(rc, patient.id, {
      code,
      limit,
    });
    return NextResponse.json({ observations });
  });
}

export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { patient, isCaregiver } = await resolvePatientFromContext(rc);
    const body = (await request.json().catch(() => ({}))) as CreateObservationInput;

    if (!body.code || (!body.valueNumber && body.valueNumber !== 0 && !body.valueText)) {
      throw new WonFlowApiError(400, "invalid-observation", "Observation code and value are required.");
    }

    const observation = await observationService.recordObservation(rc, {
      patientId: patient.id,
      encounterId: body.encounterId,
      carePlanTaskId: body.carePlanTaskId,
      source: isCaregiver ? "CAREGIVER" : "PATIENT",
      code: body.code,
      display: body.display || body.code,
      valueNumber: body.valueNumber,
      valueText: body.valueText,
      unit: body.unit,
      observedAt: body.observedAt || new Date().toISOString(),
      deviceRecordedAt: body.deviceRecordedAt,
    });

    return NextResponse.json(observation);
  });
}
