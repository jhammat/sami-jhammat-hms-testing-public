import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { caregiverService } from "@/server/patient/caregiver-service";
import { handleApiRoute } from "@/server/http/route-handler";
import type { CaregiverInviteInput } from "@wonflow/contracts";

export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const body = (await request.json()) as CaregiverInviteInput;

    const result = await caregiverService.inviteCaregiver(rc, body);
    return NextResponse.json(result, { status: 201 });
  });
}
