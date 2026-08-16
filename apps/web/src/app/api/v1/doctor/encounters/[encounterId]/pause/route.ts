import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorService } from "@/server/doctor/doctor-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function POST(_request: Request, routeContext: { params: Promise<{ encounterId: string }> }): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const { encounterId } = await routeContext.params;
    const rc = await requireRequestContext();
    const encounter = await doctorService.pauseEncounter(rc, encounterId);
    return NextResponse.json({ encounter });
  });
}
