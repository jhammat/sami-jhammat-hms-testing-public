import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { caregiverService } from "@/server/patient/caregiver-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function DELETE(
  _request: Request,
  props: { params: Promise<{ accessId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { accessId } = await props.params;
    const result = await caregiverService.revokeCaregiver(rc, accessId);
    return NextResponse.json(result);
  });
}
