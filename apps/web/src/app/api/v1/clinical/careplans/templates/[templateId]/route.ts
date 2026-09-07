import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { carePlanService } from "@/server/clinical/care-plan-service";
import { handleApiRoute } from "@/server/http/route-handler";
import type { CreateCarePlanTemplateInput } from "@wonflow/contracts";

export function GET(_request: Request, context: { params: Promise<{ templateId: string }> }): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const { templateId } = await context.params;
    const template = await carePlanService.getTemplate(await requireRequestContext(), templateId);
    return NextResponse.json({ template });
  });
}

export function PATCH(request: Request, context: { params: Promise<{ templateId: string }> }): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const { templateId } = await context.params;
    const body = (await request.json()) as Partial<CreateCarePlanTemplateInput>;
    const template = await carePlanService.updateTemplate(await requireRequestContext(), templateId, body);
    return NextResponse.json({ template });
  });
}

/**
 * Retires the template rather than removing the row — running care plans
 * reference it, and their history must keep pointing at what they were built
 * from. See `archiveTemplate`.
 */
export function DELETE(_request: Request, context: { params: Promise<{ templateId: string }> }): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const { templateId } = await context.params;
    const result = await carePlanService.archiveTemplate(await requireRequestContext(), templateId);
    return NextResponse.json(result);
  });
}
