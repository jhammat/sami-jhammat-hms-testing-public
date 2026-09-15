import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { database } from "@wonflow/database";
import { cookies, headers } from "next/headers";
import { WONFLOW_PASSWORD_CHANGE_COOKIE, WONFLOW_SESSION_COOKIE, WONFLOW_SESSION_DURATION_SECONDS } from "./session";
import type { AvailableLoginContext, AuthenticatedAccount } from "./account-service";
import type { WonFlowSessionPayload } from "./session";

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const isNextControlFlowError = (error: unknown): boolean =>
  typeof (error as { digest?: unknown } | null)?.digest === "string";
const labels: Record<WonFlowSessionPayload["role"], string> = {
  platform: "Platform Administration", admin: "Hospital Administration", reception: "Reception",
  doctor: "Doctor Workspace", patient: "Patient Portal", laboratory: "Laboratory", radiology: "Radiology",
  pharmacy: "Pharmacy", billing: "Billing", management: "Management",
  physiotherapist: "Physiotherapy Workspace", nutritionist: "Nutrition Workspace",
};

export async function createSessionCookie(account: AuthenticatedAccount, context: AvailableLoginContext | null,
  options?: { mfaVerified?: boolean; sourceApplication?: string }): Promise<void> {
  const rawToken = randomBytes(32).toString("base64url");
  const headerStore = await headers();
  const expiresAt = new Date(Date.now() + WONFLOW_SESSION_DURATION_SECONDS * 1000);
  await database.authSession.create({ data: {
    identityId: account.identityId, membershipId: context?.membershipId ?? null, tenantId: context?.tenantId ?? null,
    organizationId: context?.organizationId ?? null, branchId: context?.branchId ?? null, workspace: context?.workspace ?? null,
    patientId: context?.patientId ?? null, actingRelationship: context?.relationship ?? null,
    tokenHash: tokenHash(rawToken), sourceApplication: options?.sourceApplication ?? "web",
    ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerStore.get("user-agent"), mfaVerifiedAt: options?.mfaVerified ? new Date() : null, expiresAt,
  } });
  const isHttps =
    headerStore.get("x-forwarded-proto") === "https" ||
    headerStore.get("referer")?.startsWith("https://") ||
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://");
  const secure = Boolean(isHttps && process.env.NODE_ENV === "production");

  (await cookies()).set(WONFLOW_SESSION_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: WONFLOW_SESSION_DURATION_SECONDS,
  });
  const cookieStore = await cookies();
  if (account.mustChangePassword) {
    cookieStore.set(WONFLOW_PASSWORD_CHANGE_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: WONFLOW_SESSION_DURATION_SECONDS,
    });
  } else {
    cookieStore.delete(WONFLOW_PASSWORD_CHANGE_COOKIE);
  }
}

export async function clearSessionCookie(reason = "user-logout"): Promise<void> {
  const store = await cookies();
  const rawToken = store.get(WONFLOW_SESSION_COOKIE)?.value;
  if (rawToken) {
    try {
      await database.authSession.updateMany({
        where: { tokenHash: tokenHash(rawToken), status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date(), revocationReason: reason },
      });
    } catch (err) {
      console.error("[auth] Failed to revoke session in database:", err);
    }
  }
  store.delete(WONFLOW_SESSION_COOKIE);
  store.delete(WONFLOW_PASSWORD_CHANGE_COOKIE);
}

/**
 * The signed-in session, read once per request.
 *
 * Every portal layout now guards itself, so a single page render asks for the
 * session at least twice — the root layout for the shell, and the portal's own
 * guard. This reads the row, checks the tenant is still active and stamps
 * `lastSeenAt`, none of which is worth doing twice for one request.
 *
 * Outside a request scope `cache` simply calls through, so route handlers and
 * anything else behave exactly as before.
 */
export const readSession = cache(loadSession);

async function loadSession(): Promise<WonFlowSessionPayload | null> {
  try {
    const store = await cookies();
    const rawToken = store.get(WONFLOW_SESSION_COOKIE)?.value;
    if (!rawToken) return null;
    const session = await database.authSession.findUnique({
      where: { tokenHash: tokenHash(rawToken) },
      include: { identity: true, membership: { include: { organization: true, primaryBranch: true } } },
    });
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
        await database.authSession.update({
          where: { id: session.id },
          data: { status: "REVOKED", revokedAt: new Date(), revocationReason: `tenant-${tenant.status.toLowerCase()}` },
        });
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
      ? "platform"
      : session.patientId || (!session.membershipId && session.tenantId)
        ? "patient"
        : session.workspace
          ? session.workspace.toLowerCase() as WonFlowSessionPayload["role"]
          : "admin";

    let permissions: string[] = [];
    if (session.identity.isPlatformAdministrator) {
      permissions = [...session.identity.platformPermissionCodes];
    } else if (session.patientId) {
      const access = await database.patientAccess.findFirst({
        where: {
          patientId: session.patientId,
          identityId: session.identityId,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
        select: { permissions: true },
      });
      permissions = access?.permissions ?? ["observations.write", "careplan.complete"];
    }

    /*
     * The branch this session is actually held at.
     *
     * The label was read off `membership.primaryBranch`, which is where the
     * person's record sits rather than where they are working right now.
     * Those were always the same value until a session could move between
     * branches; now they can differ, and showing the primary would have the
     * header naming one site while the queue below it listed another.
     *
     * The primary branch is already loaded, so the extra read only happens on
     * a session that has actually been switched.
     */
    let sessionBranchName = session.membership?.primaryBranch?.name ?? null;
    if (session.branchId && session.branchId !== session.membership?.primaryBranchId) {
      const branch = await database.branch.findUnique({
        where: { id: session.branchId },
        select: { name: true },
      });
      sessionBranchName = branch?.name ?? sessionBranchName;
    }

    return {
      sessionId: session.id, identityId: session.identityId, membershipId: session.membershipId,
      tenantId: session.tenantId, organizationId: session.organizationId, branchId: session.branchId, workspace: session.workspace,
      role, email: session.identity.email, name: session.membership?.displayName ?? session.identity.email,
      orgLabel: session.membership?.organization.displayName ?? "WonFlow Platform",
      branchLabel: session.actingRelationship && session.actingRelationship !== "self"
        ? `Caregiver (${session.actingRelationship})`
        : sessionBranchName,
      portalLabel: labels[role],
      permissionCodes: permissions,
      passwordChangeRequired: session.identity.mustChangePassword,
      mfaVerified: session.mfaVerifiedAt !== null, expiresAt: session.expiresAt.toISOString(),
      patientId: session.patientId ?? null,
      actingRelationship: session.actingRelationship ?? null,
      availableWorkspaces: session.membership?.workspaceCodes ?? (session.workspace ? [session.workspace] : []),
    };
  } catch (error) {
    /*
     * Next signals control flow (redirect, notFound, bailing out of static
     * rendering when `cookies()` is read) by throwing a digest-carrying error.
     * Swallowing those breaks the framework — a static bail-out must reach the
     * renderer so the route is marked dynamic instead of logging on every page.
     */
    if (isNextControlFlowError(error)) throw error;
    console.error("[auth] Failed to read session:", error);
    return null;
  }
}
