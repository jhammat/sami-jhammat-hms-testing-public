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
    const url = new URL(request.url);
    const category = url.searchParams.get("category") || undefined;

    const results = await labResultService.listPatientLabResults(rc, patientId, category);
    return NextResponse.json({ results });
  });
}
