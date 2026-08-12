import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorService } from "@/server/doctor/doctor-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

const ACTIONS = ["call", "return", "skip", "start", "complete"] as const;
type QueueAction = (typeof ACTIONS)[number];

function isQueueAction(value: unknown): value is QueueAction {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value);
}

export function PATCH(request: Request, routeContext: { params: Promise<{ appointmentId: string }> }): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const { appointmentId } = await routeContext.params;
    const body = await request.json() as { action?: string };
    if (!isQueueAction(body.action)) {
      throw new WonFlowApiError(400, "unsupported-action", "The queue action is not supported.");
    }
    const rc = await requireRequestContext();
    const appointment = await (
      body.action === "call" ? doctorService.callQueueEntry(rc, appointmentId)
      : body.action === "return" ? doctorService.returnQueueEntry(rc, appointmentId)
      : body.action === "skip" ? doctorService.skipQueueEntry(rc, appointmentId)
      : body.action === "start" ? doctorService.startConsultation(rc, appointmentId)
      : doctorService.completeConsultation(rc, appointmentId)
    );
    return NextResponse.json({ appointment });
  });
}
