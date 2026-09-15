import { NextResponse } from "next/server";

import { listAccessibleBranches } from "@/lib/auth/branch-access";
import { readSession } from "@/lib/auth/session-server";

/**
 * The branches the signed-in staff member may switch between, and the one
 * their session is currently held at.
 *
 * Read on demand by the header switcher rather than carried on every session
 * read: resolving it needs a roles-and-branches query, and the switcher is one
 * component on one screen, not something every API request should pay for.
 */
export async function GET() {
  const session = await readSession();

  if (!session?.membershipId || !session.tenantId || !session.organizationId) {
    // Platform administrators and patient portal sessions have no membership,
    // so they have no branch to be at. Not an error — just nothing to switch.
    return NextResponse.json({ branches: [], currentBranchId: null });
  }

  const branches = await listAccessibleBranches({
    membershipId: session.membershipId,
    tenantId: session.tenantId,
    organizationId: session.organizationId,
  });

  return NextResponse.json({ branches, currentBranchId: session.branchId });
}
