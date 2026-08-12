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
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function proxy(
  request: NextRequest,
): NextResponse {
  const { pathname } = request.nextUrl;

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
