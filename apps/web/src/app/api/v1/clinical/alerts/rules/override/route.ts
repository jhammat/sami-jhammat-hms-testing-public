import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { AlertEvaluationService } from "@/server/clinical/alert-evaluation-service";
import type { SetPatientAlertRuleOverrideInput } from "@wonflow/contracts";

export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const input = (await request.json()) as SetPatientAlertRuleOverrideInput;
    const service = new AlertEvaluationService();
    const override = await service.setPatientOverride(rc, input);
    return NextResponse.json({ override });
  });
}
