import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { hospitalAdministrationService } from "@/server/admin/hospital-administration-service";

export async function GET(): Promise<NextResponse> {
  try {
    const context = await requireRequestContext();
    const [services, configuration, doctors, handlers] = await Promise.all([
      hospitalAdministrationService.listServices(context),
      hospitalAdministrationService.getConfiguration(context),
      hospitalAdministrationService.listDoctors(context),
      hospitalAdministrationService.listServiceHandlers(context),
    ]);
    return NextResponse.json({ services, configuration, doctors, handlers });
  } catch (error) {
    return safeApiError(error);
  }
}
