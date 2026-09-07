import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { educationService } from "@/server/clinical/education-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { requireClinicalPatientAccess } from "@/server/clinical/clinical-access";

export function GET(
  _request: Request,
  props: { params: Promise<{ patientId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    requireClinicalPatientAccess(rc);
    const params = await props.params;

    const assignments = await educationService.listPatientAssignments(rc, params.patientId);
    return NextResponse.json(assignments);
  });
}
