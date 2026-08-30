import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { authenticateAccount } from "@/lib/auth/account-service";
import { setPendingLoginCookie } from "@/lib/auth/pending-login";
import { createSessionCookie } from "@/lib/auth/session-server";
import { checkRateLimit, clearRateLimit, clientAddress, recordFailure, rateLimitResponse } from "@/lib/security/rate-limit";

/**
 * Per-address failure throttle. Account lockout already protects a single
 * identity; this caps how fast one source can try many identities. Only failed
 * attempts count, so shared hospital egress addresses are not penalised for
 * ordinary sign-in volume.
 */
const LOGIN_FAILURE_LIMIT = Number(process.env.WONFLOW_LOGIN_FAILURE_LIMIT ?? 20);
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

export async function POST(request: Request): Promise<NextResponse | Response> {
  const throttleKey = `login:${clientAddress(request)}`;
  const limit = checkRateLimit(throttleKey, LOGIN_FAILURE_LIMIT, LOGIN_WINDOW_MS);
  if (!limit.allowed) return rateLimitResponse(limit);

  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  if (!body?.email?.trim() || !body.password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

  const account = await authenticateAccount(body.email, body.password);
  if (!account) {
    recordFailure(throttleKey, LOGIN_WINDOW_MS);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (account.suspendedOrganizationLabel) return NextResponse.json({ error: `${account.suspendedOrganizationLabel}'s access has been suspended. Contact your platform administrator.`, code: "organization-suspended" }, { status: 403 });
  if (!account.contexts.length) return NextResponse.json({ error: "No active workspace is assigned to this account." }, { status: 403 });
  if (account.requiresMfa) return NextResponse.json({ error: "MFA verification is required.", requiresMfa: true }, { status: 403 });
  /*
   * More than one portal, so the password is right but the destination is not
   * yet known.
   *
   * This used to answer 409 with the context list and nothing else — no
   * `error` field, and no endpoint anywhere that could finish the sign-in. The
   * login screen read `data.error ?? "Invalid email or password."`, so a
   * doctor who was also an administrator was told their password was wrong,
   * every time, with no way through. A pending-login cookie is issued instead
   * and `/api/auth/select-context` completes it.
   */
  if (account.contexts.length > 1) {
    clearRateLimit(throttleKey);
    await setPendingLoginCookie(account.identityId, isSecureRequest(await headers()));

    return NextResponse.json(
      {
        requiresContextSelection: true,
        displayName: account.displayName,
        contexts: account.contexts,
      },
      { status: 200 },
    );
  }

  clearRateLimit(throttleKey);
  const context = account.contexts[0]!;
  await createSessionCookie(account, context);
  return NextResponse.json({
    homePath: account.mustChangePassword ? "/auth/change-password" : context.homePath,
    passwordChangeRequired: account.mustChangePassword,
  });
}

/**
 * Whether this request arrived over HTTPS, for the `secure` cookie flag.
 * Mirrors the check in `createSessionCookie` so the pending-login cookie and
 * the session cookie never disagree about the transport.
 */
function isSecureRequest(headerStore: Headers): boolean {
  const isHttps =
    headerStore.get("x-forwarded-proto") === "https" ||
    headerStore.get("referer")?.startsWith("https://") ||
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://");

  return Boolean(isHttps && process.env.NODE_ENV === "production");
}
