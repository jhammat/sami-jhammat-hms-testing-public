import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { pharmacyService } from "@/server/pharmacy/pharmacy-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(_request: Request, context: { params: Promise<{ itemId: string }> }) {
  return handleApiRoute(async () => {
    const { itemId } = await context.params;
    return NextResponse.json(await pharmacyService.getInventoryItem(await requireRequestContext(), itemId));
  });
}

export function PATCH(request: Request, context: { params: Promise<{ itemId: string }> }) {
  return handleApiRoute(async () => {
    const { itemId } = await context.params;
    const item = await pharmacyService.updateInventoryItem(await requireRequestContext(), itemId, await request.json());
    return NextResponse.json({ item });
  });
}
