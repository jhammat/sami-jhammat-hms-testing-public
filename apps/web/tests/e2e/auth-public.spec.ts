import { expect, test } from "@playwright/test";

test("login page is usable without demonstration credentials", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /sign in|welcome back/i })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  await expect(page.locator("#login-password")).toBeVisible();
  await expect(page.getByText(/demo password|sample password/i)).toHaveCount(0);
});
