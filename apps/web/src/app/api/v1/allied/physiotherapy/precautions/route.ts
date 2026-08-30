import { NextRequest, NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { physiotherapyService } from "@/server/allied/physiotherapy-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function POST(request: NextRequest): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const body = await request.json();
    const result = await physiotherapyService.publishPrecautionOrders(rc, body);
    return NextResponse.json(result);
  });
}
