import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { pharmacyService } from "@/server/pharmacy/pharmacy-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(request: Request) {
  return handleApiRoute(async () => {
    const url = new URL(request.url);
    const movements = await pharmacyService.listMovements(await requireRequestContext(), {
      medicationId: url.searchParams.get("medicationId") ?? undefined,
      inventoryBatchId: url.searchParams.get("inventoryBatchId") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
    });
    return NextResponse.json({ movements });
  });
}
