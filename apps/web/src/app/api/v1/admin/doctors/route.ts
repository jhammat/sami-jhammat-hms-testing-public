import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { hospitalAdministrationService } from "@/server/admin/hospital-administration-service";

export async function GET() {
  try {
    return NextResponse.json({ doctors: await hospitalAdministrationService.listDoctors(await requireRequestContext()) });
  } catch (error) {
    return safeApiError(error);
  }
}
