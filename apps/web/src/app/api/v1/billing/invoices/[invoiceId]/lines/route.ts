import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { billingService } from "@/server/finance/billing-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function POST(request: Request, context: { params: Promise<{ invoiceId: string }> }) {
  return handleApiRoute(async () => {
    const { invoiceId } = await context.params;
    const line = await billingService.addInvoiceLine(await requireRequestContext(), invoiceId, await request.json());
    return NextResponse.json({ line }, { status: 201 });
  });
}
