import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { educationService } from "@/server/clinical/education-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";
import type { CreateEducationContentInput } from "@wonflow/contracts";

export function GET(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const language = searchParams.get("language") || undefined;
    const includeInactive = searchParams.get("includeInactive") === "true";

    const items = await educationService.listPracticeContent(rc, {
      category,
      language,
      includeInactive,
    });
    return NextResponse.json(items);
  });
}

export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const body = (await request.json().catch(() => ({}))) as CreateEducationContentInput;

    if (!body.title?.trim()) {
      throw new WonFlowApiError(400, "title-required", "Content title is required.");
    }
    if (!body.category?.trim()) {
      throw new WonFlowApiError(400, "category-required", "Content category is required.");
    }

    const created = await educationService.createContent(rc, body);
    return NextResponse.json(created);
  });
}
