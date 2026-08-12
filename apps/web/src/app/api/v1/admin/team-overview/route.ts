import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { hospitalAdministrationService } from "@/server/admin/hospital-administration-service";

export async function GET(): Promise<NextResponse> {
  try {
    const context = await requireRequestContext();
    const [users, configuration, departments] = await Promise.all([
      hospitalAdministrationService.listUsers(context),
      hospitalAdministrationService.getConfiguration(context),
      hospitalAdministrationService.listDepartments(context),
    ]);
    return NextResponse.json({ users, configuration, departments });
  } catch (error) {
    return safeApiError(error);
  }
}
