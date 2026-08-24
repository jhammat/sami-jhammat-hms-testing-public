import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { database } from "@wonflow/database";
import { symptomService } from "@/server/clinical/symptom-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";
import type { RecordSymptomLogInput } from "@wonflow/contracts";

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

  return access.patient;
}

export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const body = (await request.json().catch(() => ({}))) as RecordSymptomLogInput;

    if (!body.symptomCode) {
      throw new WonFlowApiError(400, "symptom-code-required", "Symptom code is required.");
    }
    if (typeof body.severityScore !== "number") {
      throw new WonFlowApiError(400, "severity-score-required", "Severity score is required.");
    }

    const result = await symptomService.recordSymptomLog(rc, body);
    return NextResponse.json(result);
  });
}

export function GET(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const patient = await resolvePatientFromContext(rc);

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit")) || 50;

    const logs = await symptomService.listPatientSymptomLogs(rc, patient.id, limit);
    return NextResponse.json({ logs });
  });
}
