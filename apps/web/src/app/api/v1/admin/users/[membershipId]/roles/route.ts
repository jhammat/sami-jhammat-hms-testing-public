import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { safeApiError } from "@/lib/api/route-helpers";
import { hospitalAdministrationService as s } from "@/server/admin/hospital-administration-service";

export async function PATCH(r: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  try {
    const body = await r.json() as { roleIds: string[] };
    return NextResponse.json({ user: await s.assignMembershipRoles(await requireRequestContext(), (await params).membershipId, body.roleIds) });
  } catch (e) {
    return safeApiError(e);
  }
}
