import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { carePlanService } from "@/server/clinical/care-plan-service";
import { handleApiRoute } from "@/server/http/route-handler";
import type { CompleteCarePlanTaskInput } from "@wonflow/contracts";

export function POST(
  request: Request,
  props: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { taskId } = await props.params;
    const body = (await request.json().catch(() => ({}))) as CompleteCarePlanTaskInput;

    const task = await carePlanService.completeTask(rc, taskId, body);
    return NextResponse.json({ task });
  });
}
