import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { billingService } from "@/server/finance/billing-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(request: Request) {
  return handleApiRoute(async () => {
    const url = new URL(request.url);
    const payments = await billingService.listPayments(await requireRequestContext(), {
      invoiceId: url.searchParams.get("invoiceId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    return NextResponse.json({ payments });
  });
}

export function POST(request: Request) {
  return handleApiRoute(async () => {
    const payment = await billingService.createPayment(await requireRequestContext(), await request.json());
    return NextResponse.json({ payment }, { status: 201 });
  });
}
