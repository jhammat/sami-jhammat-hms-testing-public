import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { billingService } from "@/server/finance/billing-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(_request: Request, context: { params: Promise<{ invoiceId: string }> }) {
  return handleApiRoute(async () => {
    const { invoiceId } = await context.params;
    return NextResponse.json({ invoice: await billingService.getInvoice(await requireRequestContext(), invoiceId) });
  });
}

export function PATCH(request: Request, context: { params: Promise<{ invoiceId: string }> }) {
  return handleApiRoute(async () => {
    const { invoiceId } = await context.params;
    const invoice = await billingService.updateInvoice(await requireRequestContext(), invoiceId, await request.json());
    return NextResponse.json({ invoice });
  });
}
