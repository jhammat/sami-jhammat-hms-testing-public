import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import {
  acknowledgeCareTimelineEntry,
  withdrawCareTimelineAcknowledgement,
} from "@/server/clinical/care-timeline-service";
import { handleApiRoute } from "@/server/http/route-handler";

type Body = { patientId?: unknown; entryType?: unknown; recordId?: unknown; note?: unknown };

async function readBody(request: Request): Promise<Body> {
  const body = (await request.json().catch(() => null)) as Body | null;
  return body && typeof body === "object" ? body : {};
}

/** Acknowledge a colleague's entry on a patient's shared record. */
export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const body = await readBody(request);
    const acknowledgement = await acknowledgeCareTimelineEntry(await requireRequestContext(), {
      patientId: typeof body.patientId === "string" ? body.patientId : "",
      entryType: body.entryType,
      recordId: body.recordId,
      note: body.note,
    });
    return NextResponse.json({ acknowledgement }, { status: 201 });
  });
}

/** Withdraw your own acknowledgement. */
export function DELETE(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const body = await readBody(request);
    const result = await withdrawCareTimelineAcknowledgement(await requireRequestContext(), {
      patientId: typeof body.patientId === "string" ? body.patientId : "",
      entryType: body.entryType,
      recordId: body.recordId,
    });
    return NextResponse.json(result);
  });
}
