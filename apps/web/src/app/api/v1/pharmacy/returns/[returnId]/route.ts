import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { pharmacyService } from "@/server/pharmacy/pharmacy-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function PATCH(request: Request, context: { params: Promise<{ returnId: string }> }) {
  return handleApiRoute(async () => {
    const { returnId } = await context.params;
    const pharmacyReturn = await pharmacyService.updateReturn(await requireRequestContext(), returnId, await request.json());
    return NextResponse.json({ return: pharmacyReturn });
  });
}
