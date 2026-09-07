import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { labResultService } from "@/server/clinical/lab-result-service";
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
    const groups = await labResultService.getPatientLabTrends(rc, patientId);
    return NextResponse.json({ groups });
  });
}
