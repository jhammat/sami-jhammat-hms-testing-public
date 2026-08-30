import { todayIn } from "@/server/time/business-day";
import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorSittingService } from "@/server/doctor/doctor-sitting-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const date = new URL(request.url).searchParams.get("date") ?? todayIn(rc.timezone);
    return NextResponse.json(await doctorSittingService.listSittingsForDate(rc, date));
  });
}
