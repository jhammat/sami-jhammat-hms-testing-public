import { NextResponse } from "next/server";

import { loadAccountByIdentityId } from "@/lib/auth/account-service";
import { clearPendingLoginCookie, readPendingLoginIdentity } from "@/lib/auth/pending-login";
import { createSessionCookie } from "@/lib/auth/session-server";

/**
 * Completes a sign-in for an account that holds more than one portal.
 *
 * The client sends which context it wants. Nothing else about that request is
 * trusted: the identity comes from the signed, short-lived pending-login
 * cookie, and the list of contexts is re-read from the database here. The
 * posted selection is only ever used to pick one entry out of that freshly
 * loaded list — a context that does not belong to this identity simply is not
 * found, and the request is refused.
 *
 * This route did not exist. `/api/auth/login` answered 409 for a
 * multi-workspace account and there was nothing to complete it with, so those
 * accounts could not sign in at all.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const identityId = await readPendingLoginIdentity();

  if (!identityId) {
    return NextResponse.json(
      { error: "Your sign-in timed out. Enter your details again." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    role?: string;
    membershipId?: string | null;
    tenantId?: string | null;
    patientId?: string | null;
  } | null;

  if (!body?.role) {
    return NextResponse.json({ error: "Choose a portal to continue." }, { status: 400 });
  }

  const account = await loadAccountByIdentityId(identityId);

  if (!account || account.contexts.length === 0) {
    await clearPendingLoginCookie();
    return NextResponse.json(
      { error: "No active workspace is assigned to this account." },
      { status: 403 },
    );
  }

  const context = account.contexts.find(
    (candidate) =>
      candidate.role === body.role &&
      (candidate.membershipId ?? null) === (body.membershipId ?? null) &&
      (candidate.tenantId ?? null) === (body.tenantId ?? null) &&
      (candidate.patientId ?? null) === (body.patientId ?? null),
  );

  if (!context) {
    // Either a stale menu or a forged selection. The same answer for both:
    // this identity does not hold that portal.
    return NextResponse.json(
      { error: "That portal is no longer available on this account." },
      { status: 403 },
    );
  }

  await createSessionCookie(account, context);
  await clearPendingLoginCookie();

  return NextResponse.json({
    homePath: account.mustChangePassword ? "/auth/change-password" : context.homePath,
    passwordChangeRequired: account.mustChangePassword,
  });
}
