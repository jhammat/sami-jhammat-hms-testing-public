import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { billingService } from "@/server/finance/billing-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function PATCH(request: Request, context: { params: Promise<{ refundId: string }> }) {
  return handleApiRoute(async () => {
    const { refundId } = await context.params;
    const refund = await billingService.approveRefund(await requireRequestContext(), refundId, await request.json());
    return NextResponse.json({ refund });
  });
}
