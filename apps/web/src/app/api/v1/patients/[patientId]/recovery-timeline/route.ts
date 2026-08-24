import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { symptomService } from "@/server/clinical/symptom-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { patientId } = await params;
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit")) || 100;

    const timeline = await symptomService.getCombinedRecoveryTimeline(rc, patientId, limit);
    return NextResponse.json({ timeline });
  });
}
