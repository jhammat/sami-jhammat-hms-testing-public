import { NextRequest, NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { billingService } from "@/server/finance/billing-service";
import { handleApiRoute } from "@/server/http/route-handler";

/**
 * Outstanding diagnostic orders for the billing counter.
 *
 * Deliberately separate from `/api/v1/diagnostics/worklist`: that route
 * carries results and belongs to the laboratory and radiology roles. This one
 * carries only what an invoice line needs.
 */
export function GET(request: NextRequest): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const orders = await billingService.listBillableDiagnosticOrders(rc, {
      patientId: request.nextUrl.searchParams.get("patientId") ?? undefined,
    });
    return NextResponse.json({ orders });
  });
}
