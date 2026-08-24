import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { labResultService } from "@/server/clinical/lab-result-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function POST(
  request: Request,
  { params }: { params: Promise<{ resultId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { resultId } = await params;
    const result = await labResultService.confirmPatientLabResult(rc, resultId);
    return NextResponse.json(result);
  });
}
