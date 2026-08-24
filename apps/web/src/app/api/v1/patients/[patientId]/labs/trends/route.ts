import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { labResultService } from "@/server/clinical/lab-result-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { patientId } = await params;
    const groups = await labResultService.getPatientLabTrends(rc, patientId);
    return NextResponse.json({ groups });
  });
}
