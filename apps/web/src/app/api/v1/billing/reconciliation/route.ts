import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { billingService } from "@/server/finance/billing-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(request: Request) {
  return handleApiRoute(async () => {
    const url = new URL(request.url);
    const reconciliation = await billingService.getReconciliation(await requireRequestContext(), {
      from: url.searchParams.get("from") ?? "",
      to: url.searchParams.get("to") ?? "",
      branchId: url.searchParams.get("branchId") ?? undefined,
    });
    return NextResponse.json({ reconciliation });
  });
}
