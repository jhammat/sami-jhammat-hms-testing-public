import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { getMyActiveCarePlan } from "@/server/patient/patient-self-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const result = await getMyActiveCarePlan(rc);
    return NextResponse.json(result);
  });
}
