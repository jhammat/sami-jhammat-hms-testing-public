import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { pharmacyBillingService as s } from "@/server/finance/pharmacy-billing-service";
import { pharmacyService } from "@/server/pharmacy/pharmacy-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(request: Request) {
  return handleApiRoute(async () => {
    const url = new URL(request.url);
    const dispenses = await pharmacyService.listDispenses(await requireRequestContext(), { patientId: url.searchParams.get("patientId") ?? undefined });
    return NextResponse.json({ dispenses });
  });
}

export function POST(r: Request) {
  return handleApiRoute(async () => NextResponse.json({ dispense: await s.dispensePrescription(await requireRequestContext(), await r.json()) }, { status: 201 }));
}
