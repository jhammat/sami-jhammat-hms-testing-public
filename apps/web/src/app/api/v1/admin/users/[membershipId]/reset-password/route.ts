import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { hospitalAdministrationService } from "@/server/admin/hospital-administration-service";

export async function POST(request: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  try {
    const credentials = await hospitalAdministrationService.resetUserPassword(await requireRequestContext(), (await params).membershipId);
    return NextResponse.json({ credentials: { username: credentials.email, temporaryPassword: credentials.temporaryPassword, loginUrl: new URL("/login", request.url).toString() } });
  } catch (error) {
    return safeApiError(error);
  }
}
