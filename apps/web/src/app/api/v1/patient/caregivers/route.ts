import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { caregiverService } from "@/server/patient/caregiver-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const result = await caregiverService.listCaregivers(rc);
    return NextResponse.json(result);
  });
}
