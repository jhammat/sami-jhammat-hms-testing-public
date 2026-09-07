import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { authenticateAccount } from "@/lib/auth/account-service";
import { setPendingLoginCookie } from "@/lib/auth/pending-login";
import { AUDIENCE_LABELS, audienceOf, isPortalAudience, type PortalAudience } from "@/lib/auth/portal-directory";
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

/**
 * Every failure here has to answer in JSON.
 *
 * This route had no error handling, so anything that threw — an unreachable
 * database above all, since `@wonflow/database` builds its client at module
 * scope — became an empty 500 with no content-type. The sign-in screen parses
 * the response body inside its `try`, so an unparseable body landed in the
 * same `catch` as a genuine connection failure and the user was told
 * "Network error. Please check your connection and try again."
 *
 * That sent people to look at their internet while the real fault was a
 * server that could not reach its database. The message below says which of
 * the two it is, and `/api/health/ready` says whether the database is the
 * reason.
 *
 * The detail stays in the server log. This endpoint is unauthenticated, so
 * the response says that the server is at fault and nothing further.
 */
export async function POST(request: Request): Promise<NextResponse | Response> {
  try {
    return await handleLogin(request);
  } catch (error) {
    console.error("WonFlow sign-in failure", error);

    return NextResponse.json(
      {
        error:
          "The server could not complete sign-in. This is not a problem with your connection — please tell whoever runs this system.",
        code: "sign-in-unavailable",
      },
      { status: 503 },
    );
  }
}

async function handleLogin(request: Request): Promise<NextResponse | Response> {
  const throttleKey = `login:${clientAddress(request)}`;
  const limit = checkRateLimit(throttleKey, LOGIN_FAILURE_LIMIT, LOGIN_WINDOW_MS);
  if (!limit.allowed) return rateLimitResponse(limit);

  const body = await request.json().catch(() => null) as { email?: string; password?: string; audience?: string } | null;
  if (!body?.email?.trim() || !body.password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

  /*
   * Which side of the sign-in screen this came from. It used to be sent
   * nowhere and enforced nowhere, so the two doors led to the same room:
   * patient credentials typed under "Hospital staff" signed in, and the
   * session that came back was a real one. The audience is now part of the
   * request, and an account that holds nothing on the chosen side is refused
   * rather than quietly let in through the other door.
   */
  const audience: PortalAudience = isPortalAudience(body.audience) ? body.audience : "hospital";

  const account = await authenticateAccount(body.email, body.password);
  if (!account) {
    recordFailure(throttleKey, LOGIN_WINDOW_MS);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (account.suspendedOrganizationLabel) return NextResponse.json({ error: `${account.suspendedOrganizationLabel}'s access has been suspended. Contact your platform administrator.`, code: "organization-suspended" }, { status: 403 });
  if (!account.contexts.length) return NextResponse.json({ error: "No active workspace is assigned to this account." }, { status: 403 });
  if (account.requiresMfa) return NextResponse.json({ error: "MFA verification is required.", requiresMfa: true }, { status: 403 });

  const contexts = account.contexts.filter((context) => audienceOf(context.role) === audience);

  if (!contexts.length) {
    /*
     * The password was right, so the person is who they say they are — they
     * are simply at the wrong door. Saying which door is theirs leaks nothing
     * they do not already know about their own account, and refusing without
     * saying it is how you get someone typing a correct password five times
     * until the account locks.
     */
    const otherAudience = audienceOf(account.contexts[0]!.role);

    return NextResponse.json(
      {
        error: `These credentials are for the ${AUDIENCE_LABELS[otherAudience]} side of WonFlow, not the ${AUDIENCE_LABELS[audience]} side.`,
        code: "wrong-audience",
        audience: otherAudience,
      },
      { status: 403 },
    );
  }

  /*
   * More than one portal on the chosen side, so the password is right but the
   * destination is not yet known.
   *
   * This used to answer 409 with the context list and nothing else — no
   * `error` field, and no endpoint anywhere that could finish the sign-in. The
   * login screen read `data.error ?? "Invalid email or password."`, so a
   * doctor who was also an administrator was told their password was wrong,
   * every time, with no way through. A pending-login cookie is issued instead
   * and `/api/auth/select-context` completes it.
   */
  if (contexts.length > 1) {
    clearRateLimit(throttleKey);
    await setPendingLoginCookie(account.identityId, audience, isSecureRequest(await headers()));

    return NextResponse.json(
      {
        requiresContextSelection: true,
        displayName: account.displayName,
        contexts,
      },
      { status: 200 },
    );
  }

  clearRateLimit(throttleKey);
  const context = contexts[0]!;
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
