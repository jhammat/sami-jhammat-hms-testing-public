import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { medicationAdherenceService } from "@/server/clinical/medication-adherence-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { taskId } = await params;
    const body = (await request.json().catch(() => ({}))) as { completedAt?: string };
    const completedAt = body.completedAt ? new Date(body.completedAt) : undefined;

    const result = await medicationAdherenceService.recordDoseTaken(rc, taskId, completedAt);
    return NextResponse.json(result);
  });
}
