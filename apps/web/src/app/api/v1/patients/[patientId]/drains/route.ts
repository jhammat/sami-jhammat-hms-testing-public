import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { drainService } from "@/server/clinical/drain-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { requireClinicalPatientAccess } from "@/server/clinical/clinical-access";

export function GET(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    requireClinicalPatientAccess(rc);
    const { patientId } = await params;
    const drains = await drainService.listPatientDrains(rc, patientId);
    return NextResponse.json({ drains });
  });
}
