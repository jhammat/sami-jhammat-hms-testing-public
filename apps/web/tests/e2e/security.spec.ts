import { expect, test } from "@playwright/test";

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";

test("responses carry the baseline security headers", async ({ page }) => {
  const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
  const headers = response!.headers();

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  // Camera and microphone are scoped to this origin for video consultations,
  // never granted to third parties.
  expect(headers["permissions-policy"]).toContain("camera=(self)");
  expect(headers["permissions-policy"]).toContain("geolocation=()");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["content-security-policy"]).toContain("base-uri 'self'");
  // Next's version banner should not be advertised.
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("patient data responses are not stored in shared caches", async ({ page }) => {
  await page.request.post("/api/auth/login", { data: { email: "patient@wonflow.local", password } });

  // The API carries the actual record payload and must not be stored at all.
  const api = await page.request.get("/api/v1/patient/home");
  expect(api.headers()["cache-control"]).toContain("no-store");

  // Next owns Cache-Control on rendered routes and sets `no-cache,
  // must-revalidate`. That still forbids serving a cached copy without
  // revalidating, but it must never become publicly cacheable.
  const page_ = await page.goto("/patient", { waitUntil: "domcontentloaded" });
  const cacheControl = page_!.headers()["cache-control"] ?? "";
  expect(cacheControl).toMatch(/no-cache|no-store/);
  expect(cacheControl).not.toContain("public");
});

test("fingerprinted static assets stay cacheable", async ({ page }) => {
  const assets: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/_next/static/") && response.url().endsWith(".js")) assets.push(response.url());
  });
  await page.goto("/login", { waitUntil: "load" });
  expect(assets.length, "no static chunk was requested").toBeGreaterThan(0);

  const asset = await page.request.get(assets[0]!);
  // The no-store rule must not have swallowed immutable build output.
  expect(asset.headers()["cache-control"] ?? "").not.toContain("no-store");
});

test("repeated failed sign-ins from one address are throttled", async ({ page }) => {
  // A unique forwarded address keeps this bucket isolated from the rest of the suite.
  const address = `203.0.113.${Math.floor(Math.random() * 200) + 10}`;
  const attempt = (body: Record<string, string>) =>
    page.request.post("/api/auth/login", { data: body, headers: { "x-forwarded-for": address } });

  let throttled = false;
  for (let index = 0; index < 40; index += 1) {
    const response = await attempt({ email: `nobody-${index}@wonflow.local`, password: "wrong-password" });
    if (response.status() === 429) {
      expect(Number(response.headers()["retry-after"])).toBeGreaterThan(0);
      throttled = true;
      break;
    }
    expect(response.status()).toBe(401);
  }

  expect(throttled, "credential stuffing was never throttled").toBe(true);

  // A valid credential from a clean address must still be accepted.
  const clean = await page.request.post("/api/auth/login", {
    data: { email: "patient@wonflow.local", password },
    headers: { "x-forwarded-for": "203.0.113.250" },
  });
  expect(clean.status()).toBe(200);
});

test("successful sign-ins do not consume the failure budget", async ({ page }) => {
  const address = "203.0.113.251";
  for (let index = 0; index < 30; index += 1) {
    const response = await page.request.post("/api/auth/login", {
      data: { email: "patient@wonflow.local", password },
      headers: { "x-forwarded-for": address },
    });
    expect(response.status(), `sign-in ${index} was rejected`).toBe(200);
  }
});
