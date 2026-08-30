import { NextResponse } from "next/server";
import { requireTenantContext } from "@wonflow/contracts";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { hospitalAdministrationService } from "@/server/admin/hospital-administration-service";
import { readEnabledModules } from "@/server/access/workspace-modules";

export async function GET(): Promise<NextResponse> {
  try {
    const context = await requireRequestContext();
    const tenantContext = requireTenantContext(context);
    const [services, configuration, doctors, handlers, enabledModules] = await Promise.all([
      hospitalAdministrationService.listServices(context),
      hospitalAdministrationService.getConfiguration(context),
      hospitalAdministrationService.listDoctors(context),
      hospitalAdministrationService.listServiceHandlers(context),
      readEnabledModules(tenantContext.tenantId),
    ]);
    return NextResponse.json({
      services,
      configuration,
      doctors,
      handlers,
      enabledModules: Array.from(enabledModules),
    });
  } catch (error) {
    return safeApiError(error);
  }
}
