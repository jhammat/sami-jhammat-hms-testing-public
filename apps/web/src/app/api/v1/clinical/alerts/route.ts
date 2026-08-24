import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { AlertEscalationService } from "@/server/clinical/alert-escalation-service";
import type { AlertEventStatus, AlertSeverity } from "@wonflow/contracts";

export function GET(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const url = new URL(request.url);
    const status = (url.searchParams.get("status") as AlertEventStatus | "ACTIVE") || undefined;
    const severity = (url.searchParams.get("severity") as AlertSeverity) || undefined;
    const patientId = url.searchParams.get("patientId") || undefined;
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!, 10) : 50;
    const offset = url.searchParams.get("offset") ? parseInt(url.searchParams.get("offset")!, 10) : 0;

    const service = new AlertEscalationService();
    const result = await service.listAlerts(rc, {
      status,
      severity,
      patientId,
      limit,
      offset,
    });

    return NextResponse.json(result);
  });
}
