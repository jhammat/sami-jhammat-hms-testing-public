import { NextResponse } from "next/server";
import { requirePlatformContext, safeApiError } from "@/lib/api/route-helpers";
import { platformAdministrationService as service } from "@/server/platform/platform-administration-service";

interface TenantRouteContext {
  params: Promise<{ tenantId: string }>;
}

export async function POST(request: Request, { params }: TenantRouteContext) {
  try {
    const { tenantId } = await params;
    return NextResponse.json({
      result: await service.permanentlyDeleteTenant(await requirePlatformContext(), {
        tenantId,
        ...await request.json(),
      }),
    });
  } catch (error) {
    return safeApiError(error);
  }
}
