import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { carePlanService } from "@/server/clinical/care-plan-service";
import { handleApiRoute } from "@/server/http/route-handler";

/**
 * Update a task that has not been actioned yet (title, type, day, time, instructions).
 */
export function PATCH(
  request: Request,
  props: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { taskId } = await props.params;
    const body = (await request.json()) as {
      title?: string;
      taskType?: string;
      dayNumber?: number;
      scheduleTimeOfDay?: string;
      instructions?: string | null;
    };

    const task = await carePlanService.updateTask(rc, taskId, body as Parameters<typeof carePlanService.updateTask>[2]);
    return NextResponse.json({ task });
  });
}

/**
 * Remove a task that has never been completed or skipped.
 */
export function DELETE(
  _request: Request,
  props: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { taskId } = await props.params;

    const result = await carePlanService.deleteTask(rc, taskId);
    return NextResponse.json(result);
  });
}
