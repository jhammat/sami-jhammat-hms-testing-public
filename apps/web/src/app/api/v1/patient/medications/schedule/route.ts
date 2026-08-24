import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { database } from "@wonflow/database";
import { medicationAdherenceService } from "@/server/clinical/medication-adherence-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

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

export function GET(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const patient = await resolvePatientFromContext(rc);

    const url = new URL(request.url);
    const dateStr = url.searchParams.get("date");
    const targetDate = dateStr ? new Date(dateStr) : undefined;

    const schedule = await medicationAdherenceService.getPatientMedicationSchedule(
      rc,
      patient.id,
      targetDate,
    );
    return NextResponse.json(schedule);
  });
}
