import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { billingService } from "@/server/finance/billing-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(request: Request) {
  return handleApiRoute(async () => {
    const url = new URL(request.url);
    const invoices = await billingService.listInvoices(await requireRequestContext(), {
      patientId: url.searchParams.get("patientId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      branchId: url.searchParams.get("branchId") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });
    return NextResponse.json({ invoices });
  });
}

export function POST(request: Request) {
  return handleApiRoute(async () => {
    const invoice = await billingService.createInvoice(await requireRequestContext(), await request.json());
    return NextResponse.json({ invoice }, { status: 201 });
  });
}
