import { createHash, randomBytes } from "node:crypto";
import { database } from "@wonflow/database";
import { cookies, headers } from "next/headers";
import { WONFLOW_PASSWORD_CHANGE_COOKIE, WONFLOW_SESSION_COOKIE, WONFLOW_SESSION_DURATION_SECONDS } from "./session";
import type { AvailableLoginContext, AuthenticatedAccount } from "./account-service";
import type { WonFlowSessionPayload } from "./session";

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const labels: Record<WonFlowSessionPayload["role"], string> = {
  platform: "Platform Administration", admin: "Hospital Administration", reception: "Reception",
  doctor: "Doctor Workspace", patient: "Patient Portal", laboratory: "Laboratory", radiology: "Radiology",
  pharmacy: "Pharmacy", billing: "Billing", management: "Management",
};

export async function createSessionCookie(account: AuthenticatedAccount, context: AvailableLoginContext | null,
  options?: { mfaVerified?: boolean; sourceApplication?: string }): Promise<void> {
  const rawToken = randomBytes(32).toString("base64url");
  const headerStore = await headers();
  const expiresAt = new Date(Date.now() + WONFLOW_SESSION_DURATION_SECONDS * 1000);
  await database.authSession.create({ data: {
    identityId: account.identityId, membershipId: context?.membershipId ?? null, tenantId: context?.tenantId ?? null,
    organizationId: context?.organizationId ?? null, branchId: context?.branchId ?? null, workspace: context?.workspace ?? null,
    tokenHash: tokenHash(rawToken), sourceApplication: options?.sourceApplication ?? "web",
    ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerStore.get("user-agent"), mfaVerifiedAt: options?.mfaVerified ? new Date() : null, expiresAt,
  } });
  (await cookies()).set(WONFLOW_SESSION_COOKIE, rawToken, { httpOnly: true, sameSite: "lax",
    secure: process.env.NODE_ENV === "production", path: "/", maxAge: WONFLOW_SESSION_DURATION_SECONDS });
  const cookieStore = await cookies();
  if (account.mustChangePassword) {
    cookieStore.set(WONFLOW_PASSWORD_CHANGE_COOKIE, "1", { httpOnly: true, sameSite: "lax",
      secure: process.env.NODE_ENV === "production", path: "/", maxAge: WONFLOW_SESSION_DURATION_SECONDS });
  } else {
    cookieStore.delete(WONFLOW_PASSWORD_CHANGE_COOKIE);
  }
}

export async function clearSessionCookie(reason = "user-logout"): Promise<void> {
  const store = await cookies();
  const rawToken = store.get(WONFLOW_SESSION_COOKIE)?.value;
  if (rawToken) await database.authSession.updateMany({ where: { tokenHash: tokenHash(rawToken), status: "ACTIVE" },
    data: { status: "REVOKED", revokedAt: new Date(), revocationReason: reason } });
  store.delete(WONFLOW_SESSION_COOKIE);
  store.delete(WONFLOW_PASSWORD_CHANGE_COOKIE);
}

export async function readSession(): Promise<WonFlowSessionPayload | null> {
  const store = await cookies();
  const rawToken = store.get(WONFLOW_SESSION_COOKIE)?.value;
  if (!rawToken) return null;
  const session = await database.authSession.findUnique({ where: { tokenHash: tokenHash(rawToken) },
    include: { identity: true, membership: { include: { organization: true, primaryBranch: true } } } });
  /*
   * A tenant suspended mid-session must not keep working on the strength of
   * an already-issued cookie — the very next request revokes the session,
   * so the user is bounced to login and sees the real reason there, not
   * left able to keep using a suspended organization until they next sign
   * in on their own.
   */
  let tenantSuspended = false;
  if (session?.tenantId && session.status === "ACTIVE") {
    const tenant = await database.tenant.findUnique({ where: { id: session.tenantId }, select: { status: true } });
    if (tenant && tenant.status !== "ACTIVE") {
      tenantSuspended = true;
      await database.authSession.update({ where: { id: session.id }, data: { status: "REVOKED", revokedAt: new Date(), revocationReason: `tenant-${tenant.status.toLowerCase()}` } });
    }
  }
  if (!session || session.status !== "ACTIVE" || session.expiresAt <= new Date() || tenantSuspended) {
    /*
     * A stale cookie is dropped opportunistically. readSession is also called
     * while rendering (the root layout reads it), and cookies may only be
     * modified in a Server Action or Route Handler — attempting it during
     * render throws and takes the whole page down. Returning null is the
     * meaningful result; the cookie is replaced on the next sign-in and
     * clearSessionCookie removes it for good on sign-out.
     */
    try {
      store.delete(WONFLOW_SESSION_COOKIE);
    } catch {
      // Read-only cookie store: nothing to clean up here.
    }
    return null;
  }
  await database.authSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  const role: WonFlowSessionPayload["role"] = session.identity.isPlatformAdministrator && !session.membershipId
    ? "platform" : session.workspace ? session.workspace.toLowerCase() as WonFlowSessionPayload["role"] : "admin";
  return { sessionId: session.id, identityId: session.identityId, membershipId: session.membershipId,
    tenantId: session.tenantId, organizationId: session.organizationId, branchId: session.branchId, workspace: session.workspace,
    role, email: session.identity.email, name: session.membership?.displayName ?? session.identity.email,
    orgLabel: session.membership?.organization.displayName ?? "WonFlow Platform",
    branchLabel: session.membership?.primaryBranch?.name ?? null, portalLabel: labels[role],
    permissionCodes: session.identity.isPlatformAdministrator ? session.identity.platformPermissionCodes : [],
    passwordChangeRequired: session.identity.mustChangePassword,
    mfaVerified: session.mfaVerifiedAt !== null, expiresAt: session.expiresAt.toISOString() };
}
