import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { AlertEvaluationService } from "@/server/clinical/alert-evaluation-service";
import type { CreateAlertRuleInput } from "@wonflow/contracts";

export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const service = new AlertEvaluationService();
    const rules = await service.listRules(rc);
    return NextResponse.json({ rules });
  });
}

export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const input = (await request.json()) as CreateAlertRuleInput;
    const service = new AlertEvaluationService();
    const rule = await service.createRule(rc, input);
    return NextResponse.json({ rule }, { status: 201 });
  });
}
