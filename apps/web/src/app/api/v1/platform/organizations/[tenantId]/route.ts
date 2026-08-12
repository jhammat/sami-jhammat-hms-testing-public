import { NextResponse } from "next/server";
import { requirePlatformContext, safeApiError } from "@/lib/api/route-helpers";
import { platformAdministrationService as service } from "@/server/platform/platform-administration-service";

interface TenantRouteContext {
  params: Promise<{ tenantId: string }>;
}

export async function PATCH(request: Request, { params }: TenantRouteContext) {
  try {
    const { tenantId } = await params;
    return NextResponse.json({
      tenant: await service.setTenantStatus(await requirePlatformContext(), {
        tenantId,
        ...await request.json(),
      }),
    });
  } catch (error) {
    return safeApiError(error);
  }
}

export async function DELETE(request: Request, { params }: TenantRouteContext) {
  try {
    const { tenantId } = await params;
    return NextResponse.json({
      tenant: await service.archiveTenant(await requirePlatformContext(), {
        tenantId,
        ...await request.json(),
      }),
    });
  } catch (error) {
    return safeApiError(error);
  }
}
