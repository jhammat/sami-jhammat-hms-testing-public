import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorService } from "@/server/doctor/doctor-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const notes = await doctorService.listPendingCountersignatures(rc);
    return NextResponse.json({ notes });
  });
}
