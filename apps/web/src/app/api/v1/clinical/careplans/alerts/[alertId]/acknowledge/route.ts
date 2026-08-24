import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { carePlanService } from "@/server/clinical/care-plan-service";
import { handleApiRoute } from "@/server/http/route-handler";
import type { AcknowledgeAlertInput } from "@wonflow/contracts";

export function POST(
  request: Request,
  { params }: { params: Promise<{ alertId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { alertId } = await params;
    const body = (await request.json().catch(() => ({}))) as AcknowledgeAlertInput;
    const alert = await carePlanService.acknowledgeAlert(rc, alertId, body.notes);
    return NextResponse.json(alert);
  });
}
