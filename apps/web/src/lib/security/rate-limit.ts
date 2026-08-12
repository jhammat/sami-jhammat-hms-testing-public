import "server-only";

/**
 * Failure throttle for unauthenticated endpoints.
 *
 * Only *failed* attempts consume quota, and a success clears the counter. This
 * matters operationally: hospital staff usually share one public address behind
 * NAT, so counting every attempt would let one person's typos lock out a whole
 * site. Counting failures still makes credential stuffing expensive.
 *
 * Account lockout in `account-service` is the complementary per-identity
 * control; this one caps how fast a single source can try many identities.
 *
 * State is per process. A horizontally scaled deployment must back this with the
 * shared store configured in `REDIS_URL` before relying on it as the only
 * throttle.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface Window {
  failures: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Bound memory use if a host is flooded with unique keys. */
const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

/** Check whether a key is currently blocked, without consuming quota. */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }

  if (existing.failures >= limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }

  void windowMs;
  return { allowed: true, remaining: limit - existing.failures, retryAfterSeconds: 0 };
}

/** Record a failed attempt against the key. */
export function recordFailure(key: string, windowMs: number): void {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= MAX_TRACKED_KEYS) sweep(now);
    windows.set(key, { failures: 1, resetAt: now + windowMs });
    return;
  }

  existing.failures += 1;
}

/** Clear the counter after a successful attempt. */
export function clearRateLimit(key: string): void {
  windows.delete(key);
}

/**
 * Best-effort client address. `x-forwarded-for` is only trustworthy behind a
 * proxy that overwrites it; deployments must not expose the app directly.
 */
export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: "Too many failed attempts. Try again shortly." }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(result.retryAfterSeconds),
      },
    },
  );
}
