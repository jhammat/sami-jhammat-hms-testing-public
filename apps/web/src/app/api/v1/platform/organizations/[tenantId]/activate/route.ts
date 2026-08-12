import { NextResponse } from "next/server";

import { requirePlatformContext, safeApiError } from "@/lib/api/route-helpers";
import { platformAdministrationService } from "@/server/platform/platform-administration-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> },
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;
    const activation = await platformAdministrationService.activateTenant(
      await requirePlatformContext(),
      { tenantId, ...await request.json() },
    );
    return NextResponse.json({ activation });
  } catch (error) {
    return safeApiError(error);
  }
}
