import { NextResponse } from "next/server";

import { database } from "@wonflow/database";

import { listAccessibleBranches } from "@/lib/auth/branch-access";
import { readSession } from "@/lib/auth/session-server";

/**
 * Moves the current session to another branch of the same hospital.
 *
 * Staff could be assigned to several branches but never sign in at more than
 * the one their membership called primary: `AuthSession.branchId` was written
 * once at login and never changed, and everything branch-scoped — the queue,
 * the day's appointments, the till — reads it. A consultant who operates on
 * Tuesdays at the second site had no way to see that site's list.
 *
 * The branch is re-derived server-side from the caller's own role assignments,
 * exactly as `/api/auth/switch-workspace` re-derives the workspace. A branch
 * id in the request body is a request, never a grant: switching to a branch
 * this membership holds no role at is refused, and switching to one it does
 * hold changes nothing about which permissions apply there.
 */
export async function POST(request: Request) {
  try {
    const session = await readSession();

    if (!session?.sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.membershipId || !session.tenantId || !session.organizationId) {
      return NextResponse.json(
        { error: "This account is not a member of a hospital, so it has no branch to switch." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => null)) as { branchId?: string } | null;
    const branchId = body?.branchId?.trim();

    if (!branchId) {
      return NextResponse.json({ error: "Missing branch." }, { status: 400 });
    }

    const branches = await listAccessibleBranches({
      membershipId: session.membershipId,
      tenantId: session.tenantId,
      organizationId: session.organizationId,
    });
    const branch = branches.find((candidate) => candidate.id === branchId);

    if (!branch) {
      return NextResponse.json(
        { error: "You do not work at this branch, so you cannot open it." },
        { status: 403 },
      );
    }

    await database.authSession.update({
      where: { id: session.sessionId },
      data: { branchId: branch.id },
    });

    await database.auditEvent.create({
      data: {
        tenantId: session.tenantId,
        branchId: branch.id,
        actorMembershipId: session.membershipId,
        sessionId: session.sessionId,
        requestId: crypto.randomUUID(),
        action: "auth.session.branch-switched",
        entityType: "auth-session",
        entityId: session.sessionId,
        severity: "INFORMATION",
        sourceApplication: "web",
        metadata: { fromBranchId: session.branchId, toBranchId: branch.id },
      },
    });

    return NextResponse.json({ success: true, branchId: branch.id, branchName: branch.name });
  } catch (error) {
    console.error("[auth] Failed to switch branch:", error);
    return NextResponse.json({ error: "Could not switch branch." }, { status: 500 });
  }
}
