import { NextResponse } from "next/server";

import { requirePlatformContext, safeApiError } from "@/lib/api/route-helpers";
import { platformProfileService } from "@/server/platform/platform-profile-service";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const context = await requirePlatformContext();
    const body = (await request.json().catch(() => ({}))) as {
      currentPassword?: string;
      newPassword?: string;
      confirmation?: string;
    };

    const result = await platformProfileService.changePassword(context, body);
    return NextResponse.json(result);
  } catch (error) {
    return safeApiError(error);
  }
}
