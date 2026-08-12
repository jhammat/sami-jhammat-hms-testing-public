import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorFeeService } from "@/server/doctor/doctor-fee-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ serviceId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () =>
    NextResponse.json({
      service: await doctorFeeService.updateService(
        await requireRequestContext(),
        (await params).serviceId,
        await request.json(),
      ),
    }),
  );
}

export function DELETE(
  _request: Request,
  { params }: { params: Promise<{ serviceId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () =>
    NextResponse.json({
      service: await doctorFeeService.deleteService(
        await requireRequestContext(),
        (await params).serviceId,
      ),
    }),
  );
}
