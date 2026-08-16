import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { pharmacyService } from "@/server/pharmacy/pharmacy-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(request: Request) {
  return handleApiRoute(async () => {
    const url = new URL(request.url);
    const returns = await pharmacyService.listReturns(await requireRequestContext(), {
      status: url.searchParams.get("status") ?? undefined,
      dispenseId: url.searchParams.get("dispenseId") ?? undefined,
    });
    return NextResponse.json({ returns });
  });
}

export function POST(request: Request) {
  return handleApiRoute(async () => {
    const pharmacyReturn = await pharmacyService.createReturn(await requireRequestContext(), await request.json());
    return NextResponse.json({ return: pharmacyReturn }, { status: 201 });
  });
}
