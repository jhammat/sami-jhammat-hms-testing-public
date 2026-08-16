import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorService } from "@/server/doctor/doctor-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

/** The doctor's open (in progress/paused) and recently closed encounters. */
export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const result = await doctorService.listMyEncounters(rc);
    return NextResponse.json(result);
  });
}

/** Creates the clinical encounter for an appointment — the missing route named in this task, gated by the same start-consultation readiness the UI checks. */
export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const body = await request.json() as { appointmentId?: string };
    if (!body.appointmentId) {
      throw new WonFlowApiError(400, "missing-appointment-id", "appointmentId is required.");
    }
    const rc = await requireRequestContext();
    const encounter = await doctorService.createEncounter(rc, body.appointmentId);
    return NextResponse.json({ encounter }, { status: 201 });
  });
}
