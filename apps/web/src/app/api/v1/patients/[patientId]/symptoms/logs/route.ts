import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { symptomService } from "@/server/clinical/symptom-service";
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
    const limit = Number(url.searchParams.get("limit")) || 50;

    const logs = await symptomService.listPatientSymptomLogs(rc, patientId, limit);
    return NextResponse.json({ logs });
  });
}
