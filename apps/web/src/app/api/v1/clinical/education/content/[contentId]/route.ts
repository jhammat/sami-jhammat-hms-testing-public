import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { educationService } from "@/server/clinical/education-service";
import { handleApiRoute } from "@/server/http/route-handler";
import type { UpdateEducationContentInput } from "@wonflow/contracts";

export function PATCH(
  request: Request,
  props: { params: Promise<{ contentId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const params = await props.params;
    const body = (await request.json().catch(() => ({}))) as UpdateEducationContentInput;

    const updated = await educationService.updateContent(rc, params.contentId, body);
    return NextResponse.json(updated);
  });
}

export function DELETE(
  _request: Request,
  props: { params: Promise<{ contentId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const params = await props.params;

    const retired = await educationService.retireContent(rc, params.contentId, false);
    return NextResponse.json(retired);
  });
}
