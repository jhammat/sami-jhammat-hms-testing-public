import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { receptionService as s } from "@/server/reception/reception-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

export function PATCH(r: Request, c: { params: Promise<{ appointmentId: string }> }) {
  return handleApiRoute(async () => {
    const body = (await r.json()) as { action?: string; reason?: string; startsAt?: string; endsAt?: string };
    const { appointmentId } = await c.params;
    const context = await requireRequestContext();

    if (body.action === "cancel") {
      return NextResponse.json({ appointment: await s.cancelAppointment(context, appointmentId, body.reason ?? "") });
    }

    if (body.action === "reschedule") {
      if (!body.startsAt || !body.endsAt) throw new WonFlowApiError(400, "invalid-appointment-time", "A new start and end time are required.");
      return NextResponse.json({ appointment: await s.rescheduleAppointment(context, appointmentId, { startsAt: body.startsAt, endsAt: body.endsAt }) });
    }

    throw new WonFlowApiError(400, "unsupported-action", "The appointment action is not supported.");
  });
}
