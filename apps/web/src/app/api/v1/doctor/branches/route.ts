import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorProfileService } from "@/server/doctor/doctor-profile-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const profileData = await doctorProfileService.getProfile(await requireRequestContext());
    return NextResponse.json({ branches: profileData.branches });
  });
}

export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const body = await request.json() as Parameters<typeof doctorProfileService.createBranch>[1];
    const branch = await doctorProfileService.createBranch(await requireRequestContext(), body);
    return NextResponse.json({ branch }, { status: 201 });
  });
}
