import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { referralService } from "@/server/clinical/referral-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function POST(
  request: Request,
  props: { params: Promise<{ referralId: string }> },
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { referralId } = await props.params;
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const referral = await referralService.cancelReferral(rc, referralId, body.reason);
    return NextResponse.json({ referral });
  });
}
