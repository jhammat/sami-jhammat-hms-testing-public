import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { referralService } from "@/server/clinical/referral-service";
import { handleApiRoute } from "@/server/http/route-handler";
import type { CreateReferralInput, ReferralStatus } from "@wonflow/contracts";

export function GET(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const { searchParams } = new URL(request.url);

    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");

    const result = await referralService.listReferrals(rc, {
      patientId: searchParams.get("patientId") ?? undefined,
      specialty: searchParams.get("specialty") ?? undefined,
      assignedToId: searchParams.get("assignedToId") ?? undefined,
      status: (searchParams.get("status") as ReferralStatus) ?? undefined,
      page: pageParam ? parseInt(pageParam, 10) : undefined,
      pageSize: pageSizeParam ? parseInt(pageSizeParam, 10) : undefined,
    });

    return NextResponse.json(result);
  });
}

export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const body = (await request.json()) as CreateReferralInput;

    const referral = await referralService.createReferral(rc, body);
    return NextResponse.json({ referral }, { status: 201 });
  });
}
