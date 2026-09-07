import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { observationService } from "@/server/clinical/observation-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { requireClinicalPatientAccess } from "@/server/clinical/clinical-access";

export function GET(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    requireClinicalPatientAccess(rc);
    const { patientId } = await params;
    const url = new URL(request.url);
    const codesParam = url.searchParams.get("codes");
    const codes = codesParam ? codesParam.split(",").map((c) => c.trim()).filter(Boolean) : undefined;
    const startStr = url.searchParams.get("startDate");
    const endStr = url.searchParams.get("endDate");

    const startDate = startStr ? new Date(startStr) : undefined;
    const endDate = endStr ? new Date(endStr) : undefined;

    const trends = await observationService.getPatientObservationTrends(rc, patientId, {
      codes,
      startDate,
      endDate,
    });

    return NextResponse.json({ trends });
  });
}
