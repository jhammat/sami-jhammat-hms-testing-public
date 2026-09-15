import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { readCareTeam } from "@/server/clinical/care-team-service";
import { handleApiRoute } from "@/server/http/route-handler";

/**
 * The clinicians a patient can be assigned or referred to, by name.
 *
 * Allied health, every doctor with their department, and the department list
 * itself — one call, because the care plan and referral dialogs both need all
 * three to render a picker that says who someone actually is.
 */
export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const directory = await readCareTeam(await requireRequestContext());
    return NextResponse.json(directory);
  });
}
