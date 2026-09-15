import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { readCareTeam } from "@/server/clinical/care-team-service";
import { handleApiRoute } from "@/server/http/route-handler";

/**
 * The allied health clinicians a care plan or referral can be assigned to.
 *
 * Deliberately narrow: identity and placement only. A screen choosing who to
 * refer a patient to needs to render a picker, not read a colleague's staff
 * record, so nothing clinical is exposed.
 *
 * Kept as its own path because two dialogs already call it; both it and
 * `/api/v1/clinical/care-team` read the same directory, which is also what
 * provisions the staff records for allied clinicians who were invited before
 * invitation created one.
 */
export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const { allied } = await readCareTeam(await requireRequestContext());
    return NextResponse.json({ staff: allied });
  });
}
