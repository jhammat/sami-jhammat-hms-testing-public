import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

/**
 * Drives the hospital team console end to end. The route smoke test only proves
 * the page renders, so these cases exercise the interactive flows themselves:
 * inviting staff, searching, paging, resetting a password and removing access.
 */

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";
// Must match `useWonFlowPagination(filteredUsers, 6)` on the team console.
// This was 4 and the console pages 6 at a time, so every paging assertion
// compared against a page size the app has not used for some time.
const pageSize = 6;

async function loginAsAdmin(request: APIRequestContext) {
  const response = await request.post("/api/auth/login", {
    data: { email: "admin@wonflow.local", password },
  });
  expect(response.status(), "the administrator could not authenticate").toBe(200);
}

async function countUsers(request: APIRequestContext) {
  const response = await request.get("/api/v1/admin/team-overview");
  expect(response.status()).toBe(200);
  return ((await response.json()).users as unknown[]).length;
}

function userCard(page: Page, displayName: string) {
  return page.locator("article").filter({ hasText: displayName });
}

/** Clicks the confirm button of the in-app confirmation dialog (`WonFlowConfirmHost`). */
async function confirmDialog(page: Page, confirmLabel: string) {
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: confirmLabel, exact: true }).click();
  await expect(dialog).toBeHidden();
}

/** The team page shows "Showing A–B of N users" instead of "Page X of Y". */
function paginationSummary(page: Page) {
  return page.getByText(/^Showing \d+–\d+ of \d+ users/);
}

async function inviteStaff(page: Page, displayName: string, email: string) {
  await page.getByLabel("Full name").fill(displayName);
  await page.getByLabel("Email (login username)").fill(email);
  await page.getByLabel("Workspace").selectOption("RECEPTION");
  await page.getByRole("button", { name: "Invite staff" }).click();
  await expect(page.getByText("Account created — share these credentials")).toBeVisible();
}

test.describe("hospital team console", () => {
  test("an invited staff member is listed, searchable and removable", async ({ page }) => {
    await loginAsAdmin(page.request);

    const stamp = Date.now();
    const displayName = `Dummy Receptionist ${stamp}`;
    const email = `dummy.receptionist.${stamp}@wonflow.local`;

    await page.goto("/admin/team", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Hospital users" })).toBeVisible();

    await inviteStaff(page, displayName, email);

    // The invite refreshes the list; the new member is findable by search.
    const search = page.getByPlaceholder(/^Search by name, email/i);
    await search.fill(email);
    await expect(userCard(page, displayName)).toBeVisible();
    await expect(page.locator("article").filter({ hasText: "@wonflow.local" })).toHaveCount(1);

    // A search that matches nothing shows the empty state rather than crashing.
    await search.fill("no-such-person-exists");
    await expect(page.getByText("No matching users")).toBeVisible();

    await search.fill(email);
    await expect(userCard(page, displayName)).toBeVisible();

    // Reset password issues fresh temporary credentials, after confirming
    // through the in-app dialog (not a native window.confirm).
    await page.getByRole("button", { name: `Reset password for ${displayName}` }).click();
    await confirmDialog(page, "Reset password");
    await expect(page.getByText("Temporary password:", { exact: true })).toBeVisible();

    // Remove access retires the membership, also gated by the in-app dialog.
    await page.getByRole("button", { name: `Remove ${displayName}` }).click();
    await confirmDialog(page, "Remove access");
    await expect(userCard(page, displayName)).toHaveCount(0);
  });

  test("the roster pages through every user a page at a time", async ({ page }) => {
    await loginAsAdmin(page.request);

    const total = await countUsers(page.request);
    const expectedPages = Math.max(1, Math.ceil(total / pageSize));
    test.skip(expectedPages < 2, "needs more than one page of seeded users");

    await page.goto("/admin/team", { waitUntil: "networkidle" });

    const pager = paginationSummary(page);
    await expect(pager).toHaveText(`Showing 1–${Math.min(pageSize, total)} of ${total} users`);
    await expect(page.locator("article")).toHaveCount(pageSize);
    await expect(page.getByRole("button", { name: "Previous", exact: true })).toBeDisabled();

    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(pager).toHaveText(`Showing ${pageSize + 1}–${Math.min(pageSize * 2, total)} of ${total} users`);

    // The last page holds the remainder, and Next is then exhausted.
    for (let index = 2; index < expectedPages; index += 1) {
      await page.getByRole("button", { name: "Next", exact: true }).click();
    }
    const remainder = total % pageSize === 0 ? pageSize : total % pageSize;
    await expect(pager).toHaveText(`Showing ${total - remainder + 1}–${total} of ${total} users`);
    await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
    await expect(page.locator("article")).toHaveCount(remainder);

    await page.getByRole("button", { name: "Previous", exact: true }).click();
    const previousPageLast = total - remainder;
    const previousPageFirst = previousPageLast - pageSize + 1;
    await expect(pager).toHaveText(`Showing ${previousPageFirst}–${previousPageLast} of ${total} users`);
  });

  test("searching resets paging so results are never hidden behind a stale page", async ({ page }) => {
    await loginAsAdmin(page.request);

    const total = await countUsers(page.request);
    test.skip(total <= pageSize, "needs more than one page of seeded users");

    await page.goto("/admin/team", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(paginationSummary(page)).toHaveText(`Showing ${pageSize + 1}–${Math.min(pageSize * 2, total)} of ${total} users`);

    // Narrowing to a single result must jump back to page one.
    await page.getByPlaceholder(/^Search by name, email/i).fill("reception@wonflow.local");
    await expect(page.locator("article").filter({ hasText: "reception@wonflow.local" })).toBeVisible();
  });

  test("a doctor is invited against a department and the department is shown on the roster", async ({ page }) => {
    await loginAsAdmin(page.request);

    const stamp = Date.now();
    const displayName = `Dummy Doctor ${stamp}`;
    const email = `dummy.doctor.${stamp}@wonflow.local`;

    await page.goto("/admin/team", { waitUntil: "networkidle" });

    // The workspace defaults to DOCTOR, which reveals the required department field.
    await page.getByLabel("Full name").fill(displayName);
    await page.getByLabel("Email (login username)").fill(email);

    const department = page.getByLabel("Department");
    await expect(department).toBeVisible();
    await department.selectOption({ index: 1 });

    await page.getByRole("button", { name: "Invite staff" }).click();

    // Doctors receive a temporary password like every other workspace; no
    // sign-in link is issued for them.
    await expect(page.getByText("Account created — share these credentials")).toBeVisible();
    await expect(page.getByText("Temporary password:", { exact: true })).toBeVisible();

    const search = page.getByPlaceholder(/^Search by name, email/i);
    await search.fill(email);
    const card = userCard(page, displayName);
    await expect(card).toBeVisible();
    await expect(card).toContainText("DOCTOR");

    await page.getByRole("button", { name: `Remove ${displayName}` }).click();
    await confirmDialog(page, "Remove access");
    await expect(card).toHaveCount(0);
  });

  test("a doctor's department is shown on the roster and is searchable", async ({ page }) => {
    await loginAsAdmin(page.request);

    const overview = await page.request.get("/api/v1/admin/team-overview");
    const users = (await overview.json()).users as Array<{ displayName: string; doctorProfile?: { department?: { name: string } | null } | null }>;
    const doctor = users.find((user) => user.doctorProfile?.department?.name);
    test.skip(!doctor, "no seeded doctor is assigned to a department");

    const departmentName = doctor!.doctorProfile!.department!.name;

    await page.goto("/admin/team", { waitUntil: "networkidle" });

    // The department only reaches the client through the staffProfile -> doctor
    // -> department relation, so this guards that join.
    await page.getByPlaceholder(/^Search by name, email/i).fill(departmentName);
    const card = userCard(page, doctor!.displayName);
    await expect(card).toBeVisible();
    await expect(card).toContainText(departmentName);
  });

  test("inviting a doctor without a department is blocked before any request", async ({ page }) => {
    await loginAsAdmin(page.request);
    await page.goto("/admin/team", { waitUntil: "networkidle" });

    const email = `dummy.unassigned.${Date.now()}@wonflow.local`;
    await page.getByLabel("Full name").fill("Dummy Unassigned Doctor");
    await page.getByLabel("Email (login username)").fill(email);

    // The department select is `required`, so the browser blocks submission
    // before the form handler runs. Either way no invitation may be issued.
    const department = page.getByLabel("Department");
    await expect(department).toHaveJSProperty("validity.valueMissing", true);

    await page.getByRole("button", { name: "Invite staff" }).click();
    await expect(page.getByText("Account created — share these credentials")).toHaveCount(0);

    const overview = await page.request.get("/api/v1/admin/team-overview");
    expect(JSON.stringify(await overview.json())).not.toContain(email);
  });
});
