import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorProfileService } from "@/server/doctor/doctor-profile-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () =>
    NextResponse.json(await doctorProfileService.getProfile(await requireRequestContext())),
  );
}

export function PATCH(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      throw new WonFlowApiError(
        400,
        "invalid-profile-photo",
        "The uploaded photo or form data is too large for the server. Please select a smaller photo (under 1 MB).",
      );
    }
    return NextResponse.json({
      profile: await doctorProfileService.updateProfile(
        await requireRequestContext(),
        body,
      ),
    });
  });
}
