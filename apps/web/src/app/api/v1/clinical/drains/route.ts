import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { drainService } from "@/server/clinical/drain-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";
import type { InsertDrainInput } from "@wonflow/contracts";

export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const body = (await request.json().catch(() => ({}))) as InsertDrainInput;

    if (!body.patientId || !body.label || !body.site) {
      throw new WonFlowApiError(400, "invalid-drain-input", "Patient ID, drain label, and anatomical site are required.");
    }

    const drain = await drainService.insertDrain(rc, body);
    return NextResponse.json(drain);
  });
}
