import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { educationService } from "@/server/clinical/education-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";
import type { AssignEducationInput } from "@wonflow/contracts";

export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const body = (await request.json().catch(() => ({}))) as AssignEducationInput;

    if (!body.patientId) {
      throw new WonFlowApiError(400, "patient-id-required", "Patient ID is required.");
    }
    if (!body.contentId) {
      throw new WonFlowApiError(400, "content-id-required", "Content ID is required.");
    }

    const assignment = await educationService.assignContent(rc, body);
    return NextResponse.json(assignment);
  });
}
