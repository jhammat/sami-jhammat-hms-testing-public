import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { medicationAdherenceService } from "@/server/clinical/medication-adherence-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

export function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { taskId } = await params;
    const body = (await request.json().catch(() => ({}))) as { reason?: string };

    if (!body.reason || !body.reason.trim()) {
      throw new WonFlowApiError(400, "reason-required", "A reason is required when skipping a dose.");
    }

    const result = await medicationAdherenceService.recordDoseSkipped(rc, taskId, body.reason);
    return NextResponse.json(result);
  });
}
