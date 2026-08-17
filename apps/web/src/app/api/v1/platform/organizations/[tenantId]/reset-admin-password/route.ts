import { NextResponse } from "next/server";
import { requirePlatformContext, safeApiError } from "@/lib/api/route-helpers";
import { platformAdministrationService as service } from "@/server/platform/platform-administration-service";

interface TenantRouteContext {
  params: Promise<{ tenantId: string }>;
}

export async function POST(request: Request, { params }: TenantRouteContext) {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    const result = await service.resetTenantAdminPassword(await requirePlatformContext(), {
      tenantId,
      ...body,
    });
    return NextResponse.json(result);
  } catch (error) {
    return safeApiError(error);
  }
}
