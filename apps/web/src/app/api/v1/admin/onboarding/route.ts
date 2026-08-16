import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { safeApiError } from "@/lib/api/route-helpers";
import { hospitalAdministrationService as s } from "@/server/admin/hospital-administration-service";

export async function GET() {
  try {
    return NextResponse.json({ onboarding: await s.getOnboardingState(await requireRequestContext()) });
  } catch (e) {
    return safeApiError(e);
  }
}

export async function PATCH(r: Request) {
  try {
    return NextResponse.json({ onboarding: await s.updateOnboardingState(await requireRequestContext(), await r.json()) });
  } catch (e) {
    return safeApiError(e);
  }
}
