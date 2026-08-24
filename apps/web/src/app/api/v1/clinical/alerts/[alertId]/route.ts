import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { AlertEscalationService } from "@/server/clinical/alert-escalation-service";

export function GET(
  _request: Request,
  props: { params: Promise<{ alertId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { alertId } = await props.params;
    const service = new AlertEscalationService();
    const alert = await service.getAlertDetail(rc, alertId);
    return NextResponse.json({ alert });
  });
}
