import { NextRequest, NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { referralService } from "@/server/clinical/referral-service";
import { handleApiRoute } from "@/server/http/route-handler";
import type { ReferralDiscipline, ReferralStatus } from "@wonflow/contracts";

export function GET(request: NextRequest): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const searchParams = request.nextUrl.searchParams;

    const patientId = searchParams.get("patientId") || undefined;
    const specialty = searchParams.get("specialty") || undefined;
    const discipline = (searchParams.get("discipline") as ReferralDiscipline) || undefined;
    const assignedToId = searchParams.get("assignedToId") || undefined;
    const status = (searchParams.get("status") as ReferralStatus) || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : undefined;

    const result = await referralService.listReferrals(rc, {
      patientId,
      specialty,
      discipline,
      assignedToId,
      status,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  });
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const body = await request.json();
    const referral = await referralService.createReferral(rc, body);
    return NextResponse.json({ referral }, { status: 201 });
  });
}
