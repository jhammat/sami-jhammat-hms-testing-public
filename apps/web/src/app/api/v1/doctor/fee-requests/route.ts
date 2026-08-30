import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorFeeService } from "@/server/doctor/doctor-fee-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () =>
    NextResponse.json({ feeRequests: await doctorFeeService.getMyFeeRequests(await requireRequestContext()) }),
  );
}
