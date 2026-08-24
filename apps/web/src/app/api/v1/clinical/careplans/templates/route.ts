import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { carePlanService } from "@/server/clinical/care-plan-service";
import { handleApiRoute } from "@/server/http/route-handler";
import type { CreateCarePlanTemplateInput } from "@wonflow/contracts";

export function GET(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? undefined;

    const templates = await carePlanService.listTemplates(rc, category);
    return NextResponse.json({ templates });
  });
}

export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const body = (await request.json()) as CreateCarePlanTemplateInput;

    const template = await carePlanService.createTemplate(rc, body);
    return NextResponse.json({ template }, { status: 201 });
  });
}
