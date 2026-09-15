import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { listCareTeamPatients } from "@/server/clinical/care-timeline-service";
import { handleApiRoute } from "@/server/http/route-handler";

/** The patients the signed-in clinician is on the care team for, with unread update counts. */
export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const patients = await listCareTeamPatients(await requireRequestContext());
    return NextResponse.json({ patients });
  });
}
