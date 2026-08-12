import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorProfileService } from "@/server/doctor/doctor-profile-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () =>
    NextResponse.json(await doctorProfileService.getProfile(await requireRequestContext())),
  );
}

export function PATCH(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () =>
    NextResponse.json({
      profile: await doctorProfileService.updateProfile(
        await requireRequestContext(),
        await request.json() as Record<string, unknown>,
      ),
    }),
  );
}
