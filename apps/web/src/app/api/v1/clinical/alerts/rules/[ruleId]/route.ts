import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { AlertEvaluationService } from "@/server/clinical/alert-evaluation-service";
import type { UpdateAlertRuleInput } from "@wonflow/contracts";

export function PATCH(
  request: Request,
  props: { params: Promise<{ ruleId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { ruleId } = await props.params;
    const input = (await request.json()) as UpdateAlertRuleInput;
    const service = new AlertEvaluationService();
    const rule = await service.updateRule(rc, ruleId, input);
    return NextResponse.json({ rule });
  });
}
