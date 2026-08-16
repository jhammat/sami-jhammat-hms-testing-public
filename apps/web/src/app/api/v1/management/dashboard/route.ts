import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { managementDashboardService } from "@/server/management/management-dashboard-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

export function GET(request: Request) {
  return handleApiRoute(async () => {
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (!from || !to) throw new WonFlowApiError(400, "date-range-required", "A from and to date are required.");
    const dashboard = await managementDashboardService.getDashboard(await requireRequestContext(), { from, to, branchId: url.searchParams.get("branchId") ?? undefined });
    return NextResponse.json({ dashboard });
  });
}
