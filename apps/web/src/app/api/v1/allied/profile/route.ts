import { NextRequest, NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import {
  readAlliedProfile,
  updateAlliedProfile,
  type AlliedSpecialty,
} from "@/server/allied/allied-profile-service";
import { handleApiRoute } from "@/server/http/route-handler";

/**
 * The signed-in allied clinician's own profile.
 *
 * There is no id in the path on purpose: the service resolves the caller's
 * own membership from the session, so this endpoint cannot be pointed at a
 * colleague or another tenant.
 */
export function GET(request: NextRequest): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const raw = request.nextUrl.searchParams.get("specialty");
    const specialty =
      raw === "PHYSIOTHERAPY" || raw === "NUTRITION"
        ? (raw as AlliedSpecialty)
        : undefined;

    const profile = await readAlliedProfile(rc, specialty);
    return NextResponse.json({ profile });
  });
}

export function PATCH(request: NextRequest): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const raw = request.nextUrl.searchParams.get("specialty");
    const specialty =
      raw === "PHYSIOTHERAPY" || raw === "NUTRITION"
        ? (raw as AlliedSpecialty)
        : undefined;
    const body = await request.json();

    const profile = await updateAlliedProfile(
      rc,
      {
        displayName: body.displayName,
        title: body.title,
        staffType: body.staffType,
        primaryBranchId: body.primaryBranchId,
        preferredLocale: body.preferredLocale,
        clinicalFocus: Array.isArray(body.clinicalFocus) ? body.clinicalFocus : undefined,
        dailyStepGoal: typeof body.dailyStepGoal === "string" ? body.dailyStepGoal : undefined,
        spirometryGoal: typeof body.spirometryGoal === "string" ? body.spirometryGoal : undefined,
      },
      specialty,
    );

    return NextResponse.json({ profile });
  });
}
