import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { hospitalAdministrationService as service } from "@/server/admin/hospital-administration-service";

export async function POST(request: Request) {
  try {
    const result = await service.inviteUser(await requireRequestContext(), await request.json());
    const loginUrl = new URL("/login", request.url).toString();
    return NextResponse.json({ invitation: result.invitation, credentials: { mode: result.mode, username: result.email, temporaryPassword: result.temporaryPassword, loginUrl } }, { status: 201 });
  } catch (error) {
    return safeApiError(error);
  }
}
