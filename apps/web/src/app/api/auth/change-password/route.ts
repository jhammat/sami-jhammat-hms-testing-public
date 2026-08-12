import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { database } from "@wonflow/database";

import { homePathForRole } from "@/lib/auth/accounts";
import { hashPassword, validateNewPassword, verifyPassword } from "@/lib/auth/password";
import { WONFLOW_PASSWORD_CHANGE_COOKIE } from "@/lib/auth/session";
import { readSession } from "@/lib/auth/session-server";

interface ChangePasswordBody {
  currentPassword?: string;
  newPassword?: string;
  confirmation?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as ChangePasswordBody | null;
  if (!body?.currentPassword || !body.newPassword || !body.confirmation) {
    return NextResponse.json({ error: "Complete all password fields." }, { status: 400 });
  }
  if (body.newPassword !== body.confirmation) {
    return NextResponse.json({ error: "The new passwords do not match." }, { status: 400 });
  }

  const identity = await database.identity.findUnique({ where: { id: session.identityId } });
  if (!identity?.passwordHash || !(await verifyPassword(body.currentPassword, identity.passwordHash))) {
    return NextResponse.json({ error: "The temporary password is incorrect." }, { status: 400 });
  }
  if (await verifyPassword(body.newPassword, identity.passwordHash)) {
    return NextResponse.json({ error: "Choose a password different from the temporary password." }, { status: 400 });
  }

  try {
    validateNewPassword(body.newPassword);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The new password is invalid." }, { status: 400 });
  }

  const passwordHash = await hashPassword(body.newPassword);
  await database.$transaction(async (transaction) => {
    await transaction.identity.update({
      where: { id: identity.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
        status: "ACTIVE",
      },
    });
    await transaction.authSession.updateMany({
      where: { identityId: identity.id, status: "ACTIVE", id: { not: session.sessionId } },
      data: { status: "REVOKED", revokedAt: new Date(), revocationReason: "password-changed" },
    });
    await transaction.auditEvent.create({
      data: {
        tenantId: session.tenantId,
        branchId: session.branchId,
        actorMembershipId: session.membershipId,
        sessionId: session.sessionId,
        requestId: crypto.randomUUID(),
        action: "auth.temporary-password.changed",
        entityType: "identity",
        entityId: identity.id,
        severity: "INFORMATION",
        sourceApplication: "web",
      },
    });
  });

  (await cookies()).delete(WONFLOW_PASSWORD_CHANGE_COOKIE);
  return NextResponse.json({ ok: true, homePath: homePathForRole(session.role) });
}
