import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorSittingService } from "@/server/doctor/doctor-sitting-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function POST(request: Request, { params }: { params: Promise<{ sittingId: string }> }): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const { status } = await request.json() as { status: "PLANNED" | "AVAILABLE" | "ON_BREAK" | "FINISHED" };
    return NextResponse.json({
      sitting: await doctorSittingService.setMySittingStatus(
        await requireRequestContext(),
        (await params).sittingId,
        status,
      ),
    });
  });
}
