import { expect, test } from "@playwright/test";

/**
 * Guards against exactly the class of regression that once slipped through:
 * a shared, unlayered CSS rule silently overriding a Tailwind positioning
 * utility on the sidebar, collapsing it out of its fixed overlay position and
 * pushing every page's content down. That bug left every route returning 200
 * with no error text — content assertions alone would never catch it — so
 * this checks the actual rendered geometry instead.
 */

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";

const workspaces = [
  { email: "admin@wonflow.local", home: "/admin" },
  { email: "reception@wonflow.local", home: "/operations/reception" },
  { email: "doctor@wonflow.local", home: "/doctor" },
  { email: "laboratory@wonflow.local", home: "/operations/laboratory" },
  { email: "pharmacy@wonflow.local", home: "/operations/pharmacy" },
] as const;

for (const workspace of workspaces) {
  test(`${workspace.email}: sidebar stays pinned and page content sits near the top`, async ({ page, isMobile }) => {
    // The desktop sidebar is deliberately `hidden` below the `lg` breakpoint,
    // replaced by a hamburger-triggered drawer with its own interaction
    // model — a different component this spec isn't targeting.
    test.skip(isMobile, "desktop sidebar geometry only; mobile uses a separate drawer");

    const loginResponse = await page.request.post("/api/auth/login", { data: { email: workspace.email, password } });
    expect(loginResponse.status(), `${workspace.email} could not authenticate`).toBe(200);

    await page.goto(workspace.home, { waitUntil: "networkidle" });

    const sidebar = page.locator("aside.wfg-aside").first();
    await expect(sidebar).toBeVisible();

    const position = await sidebar.evaluate((element) => getComputedStyle(element).position);
    expect(position, "the sidebar must stay an overlay (fixed), not collapse into normal document flow").toBe("fixed");

    const box = await sidebar.boundingBox();
    expect(box?.x, "the sidebar must be pinned to the left edge").toBe(0);
    expect(box?.y, "the sidebar must be pinned to the top edge").toBe(0);

    // A collapsed-to-flow sidebar pushes everything below it; a heading far
    // down the viewport is the visible symptom a screenshot would show.
    // `:visible` skips headings inside closed dialogs/modals rendered
    // earlier in the DOM (several portals mount those unconditionally).
    const heading = page.locator("h1:visible, h2:visible").first();
    await expect(heading).toBeVisible();
    const headingBox = await heading.boundingBox();
    expect(headingBox?.y ?? 9999, "page content must render near the top, not pushed down by a broken sidebar").toBeLessThan(300);
  });
}
