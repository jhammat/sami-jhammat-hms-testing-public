import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { readCareTimeline } from "@/server/clinical/care-timeline-service";
import { handleApiRoute } from "@/server/http/route-handler";

/**
 * One patient's shared care record — every discipline's entries, in order.
 *
 * Access is decided inside the service by `assertCareTeamPatientAccess`, the
 * single care-team rule: clinical role, patient in tenant, patient in the
 * caller's referral scope.
 */
export function GET(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const patientId = new URL(request.url).searchParams.get("patientId") ?? "";
    const timeline = await readCareTimeline(await requireRequestContext(), patientId);
    return NextResponse.json({ timeline });
  });
}
