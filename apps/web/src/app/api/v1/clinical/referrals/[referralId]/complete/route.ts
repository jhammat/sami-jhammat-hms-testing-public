import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { referralService } from "@/server/clinical/referral-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function POST(
  _request: Request,
  props: { params: Promise<{ referralId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { referralId } = await props.params;
    const referral = await referralService.completeReferral(rc, referralId);
    return NextResponse.json({ referral });
  });
}
