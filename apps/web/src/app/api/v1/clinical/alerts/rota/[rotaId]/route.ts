import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { AlertEscalationService } from "@/server/clinical/alert-escalation-service";

export function DELETE(
  _request: Request,
  props: { params: Promise<{ rotaId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { rotaId } = await props.params;
    const service = new AlertEscalationService();
    const deleted = await service.deleteRota(rc, rotaId);
    return NextResponse.json({ deleted });
  });
}
