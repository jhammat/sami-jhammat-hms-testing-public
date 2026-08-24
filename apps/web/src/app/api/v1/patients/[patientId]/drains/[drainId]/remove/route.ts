import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { drainService } from "@/server/clinical/drain-service";
import { handleApiRoute } from "@/server/http/route-handler";
import type { RemoveDrainInput } from "@wonflow/contracts";

export function POST(
  request: Request,
  { params }: { params: Promise<{ patientId: string; drainId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { patientId, drainId } = await params;
    const body = (await request.json().catch(() => ({}))) as RemoveDrainInput;

    const drain = await drainService.removeDrain(rc, patientId, drainId, body);
    return NextResponse.json(drain);
  });
}
