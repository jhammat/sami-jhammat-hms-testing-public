import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { carePlanService } from "@/server/clinical/care-plan-service";
import { handleApiRoute } from "@/server/http/route-handler";
import type { AddProgressNoteInput } from "@wonflow/contracts";

export function POST(
  request: Request,
  { params }: { params: Promise<{ carePlanId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { carePlanId } = await params;
    const body = (await request.json().catch(() => ({}))) as AddProgressNoteInput;
    const plan = await carePlanService.addProgressNote(rc, carePlanId, body.note);
    return NextResponse.json(plan);
  });
}
