import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { pharmacyService } from "@/server/pharmacy/pharmacy-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(request: Request) {
  return handleApiRoute(async () => {
    const url = new URL(request.url);
    const batches = await pharmacyService.listBatches(await requireRequestContext(), {
      medicationId: url.searchParams.get("medicationId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    return NextResponse.json({ batches });
  });
}

export function POST(request: Request) {
  return handleApiRoute(async () => {
    const batch = await pharmacyService.createBatch(await requireRequestContext(), await request.json());
    return NextResponse.json({ batch }, { status: 201 });
  });
}
