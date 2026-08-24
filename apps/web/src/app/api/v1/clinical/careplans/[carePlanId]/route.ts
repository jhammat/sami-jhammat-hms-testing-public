import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { carePlanService } from "@/server/clinical/care-plan-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(
  _request: Request,
  props: { params: Promise<{ carePlanId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { carePlanId } = await props.params;

    const carePlan = await carePlanService.getPlan(rc, carePlanId);
    return NextResponse.json({ carePlan });
  });
}
