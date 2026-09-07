import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { carePlanService } from "@/server/clinical/care-plan-service";
import { handleApiRoute } from "@/server/http/route-handler";

/**
 * Add a new task to a running care plan.
 */
export function POST(
  request: Request,
  props: { params: Promise<{ carePlanId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { carePlanId } = await props.params;
    const body = (await request.json()) as {
      title: string;
      taskType: string;
      dayNumber?: number;
      scheduleTimeOfDay?: string;
      instructions?: string;
    };

    const task = await carePlanService.addTask(rc, carePlanId, body as Parameters<typeof carePlanService.addTask>[2]);
    return NextResponse.json({ task });
  });
}
