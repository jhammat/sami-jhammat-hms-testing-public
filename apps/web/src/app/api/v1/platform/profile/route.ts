import { NextResponse } from "next/server";

import { requirePlatformContext, safeApiError } from "@/lib/api/route-helpers";
import { platformProfileService } from "@/server/platform/platform-profile-service";

export async function GET(): Promise<NextResponse> {
  try {
    const context = await requirePlatformContext();
    const profile = await platformProfileService.getProfile(context);
    return NextResponse.json({ profile });
  } catch (error) {
    return safeApiError(error);
  }
}
