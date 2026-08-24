import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { educationService } from "@/server/clinical/education-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const summary = await educationService.getClinicianComplianceSummary(rc);
    return NextResponse.json(summary);
  });
}
