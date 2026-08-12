import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { receptionService } from "@/server/reception/reception-service";
import { handleApiRoute } from "@/server/http/route-handler";

/** Places laboratory and radiology orders for a walk-in booked at reception. */
export function POST(request: Request) {
  return handleApiRoute(async () =>
    NextResponse.json(
      { orders: await receptionService.createDiagnosticOrders(await requireRequestContext(), await request.json()) },
      { status: 201 },
    ),
  );
}
