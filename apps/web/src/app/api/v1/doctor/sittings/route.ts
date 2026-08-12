import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorSittingService } from "@/server/doctor/doctor-sitting-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const from = new URL(request.url).searchParams.get("from") ?? undefined;
    return NextResponse.json(
      await doctorSittingService.listMySittings(await requireRequestContext(), from),
    );
  });
}

export function PUT(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () =>
    NextResponse.json({
      sitting: await doctorSittingService.saveMySitting(
        await requireRequestContext(),
        await request.json() as Parameters<typeof doctorSittingService.saveMySitting>[1],
      ),
    }),
  );
}
