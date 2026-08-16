import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorService } from "@/server/doctor/doctor-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

export function POST(request: Request, routeContext: { params: Promise<{ encounterId: string }> }): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const { encounterId } = await routeContext.params;
    const body = await request.json() as { reason?: string };
    if (!body.reason?.trim()) {
      throw new WonFlowApiError(400, "cancellation-reason-required", "A reason is required to cancel a consultation.");
    }
    const rc = await requireRequestContext();
    const encounter = await doctorService.cancelEncounter(rc, encounterId, body.reason);
    return NextResponse.json({ encounter });
  });
}
