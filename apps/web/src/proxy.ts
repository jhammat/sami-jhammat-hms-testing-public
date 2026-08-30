import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { WONFLOW_PASSWORD_CHANGE_COOKIE, WONFLOW_SESSION_COOKIE } from "@/lib/auth/session";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/book",
  "/patient/register",
  "/brand",
  "/favicon.ico",
  // Everything the browser needs to install WonFlow as an app. All of it is
  // static, none of it says anything about a patient or an account, and all
  // of it is fetched before anyone has signed in.
  //
  // These were being redirected to /login, which is why installation never
  // worked: the manifest came back as an HTML redirect rather than JSON, and
  // a service worker served as text/html is rejected outright by the browser.
  "/manifest.webmanifest",
  "/sw.js",
  "/offline.html",
  "/icon.png",
  "/apple-icon.png",
  // Bearer-capability document links: the unguessable, short-lived, single-use
  // token in the path is the authorization, not the session cookie — see
  // consumePatientDocumentAccessToken in patient-document-service.ts.
  "/api/v1/patient/documents/access",
  // The embeddable public booking widget behind /book — its own endpoints are
  // rate-limited and tenant-scoped in public-registration-service.ts, not by
  // a session, since a website visitor has no WonFlow account yet.
  "/api/v1/public-registration",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Second, independent CSRF layer alongside the session cookie's
 * `SameSite=Lax` — a single defense with no backup. A real browser always
 * sends `Origin` on a cross-site mutating request (and on same-site ones
 * too, per the Fetch standard), so a present-but-mismatched Origin is a
 * reliable cross-site forgery signal. A missing Origin is left alone rather
 * than rejected: non-browser API clients and test tooling routinely omit
 * it, and SameSite=Lax already covers the browser case that would omit it.
 */
function isForgedOrigin(request: NextRequest): boolean {
  if (!MUTATING_METHODS.has(request.method)) return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  // request.nextUrl.origin can silently normalize to a dev-server default
  // host (e.g. "localhost") that differs from what the client actually
  // connected to — the Host header the client sent is the reliable source.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;
  const expected = `${request.nextUrl.protocol}//${host}`;
  return origin !== expected;
}

export default function proxy(
  request: NextRequest,
): NextResponse {
  const { pathname } = request.nextUrl;

  if (isForgedOrigin(request)) {
    return NextResponse.json(
      { error: "This request's origin does not match the site it was sent to.", code: "origin-mismatch" },
      { status: 403 },
    );
  }

  const token = request.cookies.get(WONFLOW_SESSION_COOKIE)?.value;
  const passwordChangeRequired = request.cookies.get(WONFLOW_PASSWORD_CHANGE_COOKIE)?.value === "1";

  if (
    token &&
    passwordChangeRequired &&
    pathname !== "/auth/change-password" &&
    pathname !== "/login" &&
    pathname !== "/api/auth/change-password" &&
    pathname !== "/api/auth/logout"
  ) {
    return NextResponse.redirect(new URL("/auth/change-password", request.url));
  }

  if (pathname === "/login") {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Never intercept framework internals. Matching `/_next/*` sends the
   * development hot-reload websocket upgrade through the authentication
   * redirect, which fails the handshake and leaves the client runtime unable
   * to hydrate.
   */
  matcher: ["/((?!_next/).*)"],
};
