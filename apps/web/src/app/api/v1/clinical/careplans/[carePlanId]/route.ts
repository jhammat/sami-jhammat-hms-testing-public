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

/**
 * Update a running care plan (rename, pause, resume, change end date, etc.).
 */
export function PATCH(
  request: Request,
  props: { params: Promise<{ carePlanId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { carePlanId } = await props.params;
    const body = (await request.json()) as {
      title?: string;
      status?: "ACTIVE" | "PAUSED" | "COMPLETED" | "DISCONTINUED";
      endDate?: string | null;
      assignedTherapistId?: string | null;
      assignedNutritionistId?: string | null;
    };

    const carePlan = await carePlanService.updatePlan(rc, carePlanId, body);
    return NextResponse.json({ carePlan });
  });
}

/**
 * Discontinue or delete a care plan. Plans with recorded activity are
 * discontinued (soft); pristine plans are removed outright.
 */
export function DELETE(
  request: Request,
  props: { params: Promise<{ carePlanId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { carePlanId } = await props.params;

    let reason: string | undefined;
    try {
      const body = (await request.json()) as { reason?: string };
      reason = body.reason;
    } catch {
      // no body is fine
    }

    const result = await carePlanService.discontinuePlan(rc, carePlanId, reason);
    return NextResponse.json(result);
  });
}
