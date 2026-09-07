import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { database } from "@wonflow/database";
import { labResultService } from "@/server/clinical/lab-result-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";
import type { RecordLabResultInput } from "@wonflow/contracts";

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
    const patient = await resolvePatientFromContext(rc);
    const body = (await request.json().catch(() => ({}))) as Omit<RecordLabResultInput, "patientId">;

    if (!body.code) {
      throw new WonFlowApiError(400, "code-required", "Lab test code is required.");
    }
    if (typeof body.value !== "number") {
      throw new WonFlowApiError(400, "value-required", "Numeric value is required.");
    }

    const result = await labResultService.recordLabResult(rc, {
      ...body,
      patientId: patient.id,
      entryRoute: "PATIENT_REPORTED",
    });

    return NextResponse.json(result);
  });
}

export function GET(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const patient = await resolvePatientFromContext(rc);

    const url = new URL(request.url);
    const category = url.searchParams.get("category") || undefined;

    // The patient's own view shows only what a clinician has verified and
    // released — never a preliminary draft still being typed in the lab.
    const results = await labResultService.listPatientLabResults(rc, patient.id, category, {
      releasedOnly: true,
    });
    return NextResponse.json({ results });
  });
}
