import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { medicationAdherenceService } from "@/server/clinical/medication-adherence-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { patientId } = await params;
    const report = await medicationAdherenceService.getClinicianAdherenceReport(rc, patientId);
    return NextResponse.json({ report });
  });
}
