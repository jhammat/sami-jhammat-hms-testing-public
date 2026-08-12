import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorFeeService } from "@/server/doctor/doctor-fee-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () =>
    NextResponse.json({ services: await doctorFeeService.getServices(await requireRequestContext()) }),
  );
}

export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () =>
    NextResponse.json(
      { service: await doctorFeeService.createService(await requireRequestContext(), await request.json()) },
      { status: 201 },
    ),
  );
}
