import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { pharmacyService } from "@/server/pharmacy/pharmacy-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(request: Request) {
  return handleApiRoute(async () => {
    const url = new URL(request.url);
    const receipts = await pharmacyService.listPurchaseReceipts(await requireRequestContext(), { status: url.searchParams.get("status") ?? undefined });
    return NextResponse.json({ receipts });
  });
}

export function POST(request: Request) {
  return handleApiRoute(async () => {
    const receipt = await pharmacyService.createPurchaseReceipt(await requireRequestContext(), await request.json());
    return NextResponse.json({ receipt }, { status: 201 });
  });
}
