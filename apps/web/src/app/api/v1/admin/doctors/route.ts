import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { hospitalAdministrationService } from "@/server/admin/hospital-administration-service";

export async function GET() {
  try {
    const rc = await requireRequestContext();
    const [doctors, branches, departments] = await Promise.all([
      hospitalAdministrationService.listDoctors(rc),
      hospitalAdministrationService.listBranches(rc),
      hospitalAdministrationService.listDepartments(rc),
    ]);
    return NextResponse.json({ doctors, branches, departments });
  } catch (error) {
    return safeApiError(error);
  }
}
