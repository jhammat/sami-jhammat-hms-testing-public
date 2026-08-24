import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { labResultService } from "@/server/clinical/lab-result-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";
import type { RecordLabResultInput } from "@wonflow/contracts";

export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const body = (await request.json().catch(() => ({}))) as RecordLabResultInput;

    if (!body.patientId) {
      throw new WonFlowApiError(400, "patient-id-required", "Patient ID is required.");
    }
    if (!body.code) {
      throw new WonFlowApiError(400, "test-code-required", "Lab test code is required.");
    }
    if (typeof body.value !== "number") {
      throw new WonFlowApiError(400, "value-required", "Numeric result value is required.");
    }

    const result = await labResultService.recordLabResult(rc, body);
    return NextResponse.json(result);
  });
}
