import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit, clearRateLimit, clientAddress, recordFailure } from "./rate-limit";

const LIMIT = 3;
const WINDOW = 60_000;

let key = "";

beforeEach(() => {
  key = `test:${Math.random()}`;
  vi.useRealTimers();
});

describe("failure throttle", () => {
  it("allows a fresh key", () => {
    expect(checkRateLimit(key, LIMIT, WINDOW).allowed).toBe(true);
  });

  it("does not consume quota on a successful attempt", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      expect(checkRateLimit(key, LIMIT, WINDOW).allowed).toBe(true);
    }
  });

  it("blocks once failures reach the limit", () => {
    for (let attempt = 0; attempt < LIMIT; attempt += 1) recordFailure(key, WINDOW);

    const result = checkRateLimit(key, LIMIT, WINDOW);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("stays allowed while below the limit", () => {
    recordFailure(key, WINDOW);
    recordFailure(key, WINDOW);
    expect(checkRateLimit(key, LIMIT, WINDOW).allowed).toBe(true);
  });

  it("clears the counter after a success", () => {
    for (let attempt = 0; attempt < LIMIT; attempt += 1) recordFailure(key, WINDOW);
    expect(checkRateLimit(key, LIMIT, WINDOW).allowed).toBe(false);

    clearRateLimit(key);
    expect(checkRateLimit(key, LIMIT, WINDOW).allowed).toBe(true);
  });

  it("releases the block once the window expires", () => {
    vi.useFakeTimers();
    for (let attempt = 0; attempt < LIMIT; attempt += 1) recordFailure(key, WINDOW);
    expect(checkRateLimit(key, LIMIT, WINDOW).allowed).toBe(false);

    vi.advanceTimersByTime(WINDOW + 1);
    expect(checkRateLimit(key, LIMIT, WINDOW).allowed).toBe(true);
  });

  it("tracks each key independently", () => {
    const other = `${key}:other`;
    for (let attempt = 0; attempt < LIMIT; attempt += 1) recordFailure(key, WINDOW);

    expect(checkRateLimit(key, LIMIT, WINDOW).allowed).toBe(false);
    expect(checkRateLimit(other, LIMIT, WINDOW).allowed).toBe(true);
  });
});

describe("clientAddress", () => {
  it("takes the first hop of x-forwarded-for", () => {
    const request = new Request("https://example.test", {
      headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18" },
    });
    expect(clientAddress(request)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    const request = new Request("https://example.test", { headers: { "x-real-ip": "198.51.100.4" } });
    expect(clientAddress(request)).toBe("198.51.100.4");
  });

  it("reports unknown when no proxy header is present", () => {
    expect(clientAddress(new Request("https://example.test"))).toBe("unknown");
  });
});
