import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorSittingService } from "@/server/doctor/doctor-sitting-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const date = new URL(request.url).searchParams.get("date")
      ?? new Date().toISOString().slice(0, 10);
    return NextResponse.json(
      await doctorSittingService.listSittingsForDate(await requireRequestContext(), date),
    );
  });
}
