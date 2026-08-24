import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { AlertEscalationService } from "@/server/clinical/alert-escalation-service";

export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const service = new AlertEscalationService();
    const stats = await service.getAlertStats(rc);
    return NextResponse.json({ stats });
  });
}
