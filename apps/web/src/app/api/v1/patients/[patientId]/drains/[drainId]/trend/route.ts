import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { drainService } from "@/server/clinical/drain-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(
  request: Request,
  { params }: { params: Promise<{ patientId: string; drainId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { patientId, drainId } = await params;
    const trend = await drainService.getDrainTrend(rc, patientId, drainId);
    return NextResponse.json(trend);
  });
}
