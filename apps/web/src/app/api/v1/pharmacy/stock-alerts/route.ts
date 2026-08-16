import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { pharmacyService } from "@/server/pharmacy/pharmacy-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET() {
  return handleApiRoute(async () => NextResponse.json(await pharmacyService.getStockAlerts(await requireRequestContext())));
}
