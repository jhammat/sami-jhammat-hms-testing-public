import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { hospitalAdministrationService as service } from "@/server/admin/hospital-administration-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ policyId: string }> }) {
  try {
    const { policyId } = await params;
    const body = await request.json();
    const context = await requireRequestContext();
    if (body.action === "publish") return NextResponse.json({ policy: await service.publishPolicy(context, policyId) });
    if (body.action === "archive") return NextResponse.json({ policy: await service.setPolicyArchived(context, policyId, true) });
    if (body.action === "restore") return NextResponse.json({ policy: await service.setPolicyArchived(context, policyId, false) });
    return NextResponse.json({ policy: await service.updatePolicy(context, policyId, body) });
  } catch (error) {
    return safeApiError(error);
  }
}
