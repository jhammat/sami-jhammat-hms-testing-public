import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { pharmacyService } from "@/server/pharmacy/pharmacy-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(request: Request) {
  return handleApiRoute(async () => {
    const url = new URL(request.url);
    const items = await pharmacyService.listInventory(await requireRequestContext(), { lowStockOnly: url.searchParams.get("lowStockOnly") === "true" });
    return NextResponse.json({ items });
  });
}

export function POST(request: Request) {
  return handleApiRoute(async () => {
    const item = await pharmacyService.createMedication(await requireRequestContext(), await request.json());
    return NextResponse.json({ item }, { status: 201 });
  });
}
