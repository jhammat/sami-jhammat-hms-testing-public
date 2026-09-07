import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { safeApiError } from "@/lib/api/route-helpers";
import { hospitalAdministrationService as s } from "@/server/admin/hospital-administration-service";

export async function GET() {
  try {
    const rc = await requireRequestContext();
    const profile = await s.getAdministratorProfile(rc);
    return NextResponse.json({ profile });
  } catch (error) {
    return safeApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const rc = await requireRequestContext();
    const body = await request.json();
    const profile = await s.updateAdministratorProfile(rc, body);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return safeApiError(error);
  }
}
