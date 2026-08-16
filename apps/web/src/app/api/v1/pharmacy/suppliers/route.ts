import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { pharmacyService } from "@/server/pharmacy/pharmacy-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET() {
  return handleApiRoute(async () => NextResponse.json({ suppliers: await pharmacyService.listSuppliers(await requireRequestContext()) }));
}

export function POST(request: Request) {
  return handleApiRoute(async () => {
    const supplier = await pharmacyService.createSupplier(await requireRequestContext(), await request.json());
    return NextResponse.json({ supplier }, { status: 201 });
  });
}
