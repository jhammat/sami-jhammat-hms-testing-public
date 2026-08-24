import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { carePlanService } from "@/server/clinical/care-plan-service";
import { handleApiRoute } from "@/server/http/route-handler";
import type { InstantiateCarePlanInput } from "@wonflow/contracts";

export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const body = (await request.json()) as InstantiateCarePlanInput;

    const carePlan = await carePlanService.instantiatePlan(rc, body);
    return NextResponse.json({ carePlan }, { status: 201 });
  });
}
