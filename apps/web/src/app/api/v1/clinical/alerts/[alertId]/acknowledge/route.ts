import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { AlertEscalationService } from "@/server/clinical/alert-escalation-service";
import type { AcknowledgeAlertEventInput } from "@wonflow/contracts";

export function POST(
  request: Request,
  props: { params: Promise<{ alertId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { alertId } = await props.params;
    const input = ((await request.json().catch(() => ({}))) || {}) as AcknowledgeAlertEventInput;
    const service = new AlertEscalationService();
    const alert = await service.acknowledgeAlert(rc, alertId, input);
    return NextResponse.json({ alert });
  });
}
