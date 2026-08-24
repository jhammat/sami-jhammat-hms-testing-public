import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { educationService } from "@/server/clinical/education-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";
import type { CompleteEducationInput } from "@wonflow/contracts";

export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const body = (await request.json().catch(() => ({}))) as CompleteEducationInput;

    if (!body.assignmentId) {
      throw new WonFlowApiError(400, "assignment-id-required", "Assignment ID is required.");
    }

    const updated = await educationService.completeAssignment(rc, body);
    return NextResponse.json(updated);
  });
}
