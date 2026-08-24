import { NextRequest, NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { referralService } from "@/server/clinical/referral-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

interface RouteParams {
  params: Promise<{ referralId: string }>;
}

export function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { referralId } = await params;
    const referral = await referralService.getReferral(rc, referralId);
    return NextResponse.json({ referral });
  });
}

export function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { referralId } = await params;
    const body = await request.json();

    const action = body.action?.toUpperCase();

    if (action === "ACCEPT") {
      const referral = await referralService.acceptReferral(rc, referralId, {
        notes: body.notes,
      });
      return NextResponse.json({ referral });
    }

    if (action === "START") {
      const referral = await referralService.startReferral(rc, referralId);
      return NextResponse.json({ referral });
    }

    if (action === "COMPLETE") {
      const referral = await referralService.completeReferral(rc, referralId, {
        outcomeNotes: body.outcomeNotes,
      });
      return NextResponse.json({ referral });
    }

    if (action === "CANCEL" || action === "DECLINE") {
      const referral = await referralService.cancelReferral(
        rc,
        referralId,
        body.reason,
      );
      return NextResponse.json({ referral });
    }

    throw new WonFlowApiError(
      400,
      "invalid-action",
      "Action must be ACCEPT, START, COMPLETE, or DECLINE.",
    );
  });
}
