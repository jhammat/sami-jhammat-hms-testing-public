import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { isPortalAudience, type PortalAudience } from "./portal-directory";

/**
 * The short-lived proof that a password was accepted a moment ago.
 *
 * An account with more than one workspace cannot be signed straight in — the
 * server does not know which portal they meant. That leaves a gap between
 * "password verified" and "session created", and something has to carry the
 * identity across it.
 *
 * It is not the client. A context posted from the browser is a request, not a
 * fact: the only thing trusted from the second step is which of the identity's
 * OWN contexts was picked, and that list is re-read from the database on the
 * server. This cookie carries the identity id and an expiry, signed with
 * SESSION_SECRET, and nothing else. It is httpOnly, lives for two minutes, and
 * is deleted the moment a real session exists.
 *
 * The alternative — keeping the password in browser memory and re-sending it
 * with the chosen context — was rejected: it doubles the number of times a
 * password crosses the wire and leaves it sitting in JavaScript state while a
 * person reads a menu.
 */

const COOKIE = "wonflow_pending_login";
const TTL_SECONDS = 120;

function secret(): string {
  const value = process.env.SESSION_SECRET;

  if (!value || value.length < 32) {
    // Refusing is the safe failure. A weak or missing secret would make this
    // token forgeable, and a forgeable token is a way to pick any identity.
    throw new Error(
      "SESSION_SECRET must be set to at least 32 characters before a login can be completed.",
    );
  }

  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on a length mismatch, which is itself a leak of
  // sorts; compare lengths first and keep the comparison constant-time.
  return left.length === right.length && timingSafeEqual(left, right);
}

export interface PendingLogin {
  identityId: string;
  /**
   * Which side of the sign-in screen the password was entered on.
   *
   * The audience used to be decoration: the screen asked "hospital staff or
   * patient?" and then ignored the answer, so patient credentials typed on
   * the staff side signed in perfectly well. It is carried here, signed,
   * because the second step must be held to the same answer as the first —
   * otherwise the choice could simply be skipped by posting a context from
   * the other side.
   */
  audience: PortalAudience;
}

export async function setPendingLoginCookie(
  identityId: string,
  audience: PortalAudience,
  secure: boolean,
): Promise<void> {
  const expiresAt = Date.now() + TTL_SECONDS * 1000;
  const payload = `${identityId}.${audience}.${expiresAt}`;
  const value = `${payload}.${sign(payload)}`;

  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

/** The identity and side a pending login belongs to, or null if there is not a valid one. */
export async function readPendingLogin(): Promise<PendingLogin | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;

  const parts = raw.split(".");
  if (parts.length !== 4) return null;

  const [identityId, audience, expiresAtRaw, signature] = parts as [string, string, string, string];
  if (!safeEqual(signature, sign(`${identityId}.${audience}.${expiresAtRaw}`))) return null;
  if (!isPortalAudience(audience)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  return { identityId, audience };
}

export async function clearPendingLoginCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
