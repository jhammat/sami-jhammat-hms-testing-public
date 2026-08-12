import { NextResponse } from "next/server";

import { requirePlatformContext, safeApiError } from "@/lib/api/route-helpers";
import { platformAdministrationService } from "@/server/platform/platform-administration-service";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({
      dashboard: await platformAdministrationService.getDashboard(await requirePlatformContext()),
    });
  } catch (error) {
    return safeApiError(error);
  }
}
