import { test, expect } from "../fixtures/base";

const ADMIN_URL =
  process.env.ADMIN_URL || "https://lydmarkets-admin-production.up.railway.app";

test.describe("SCRUM-540: Two-stage market approval workflow", () => {
  test(
    "admin login page loads with credentials form",
    { tag: ["@smoke", "@compliance"] },
    async ({ page }) => {
      await page.goto(`${ADMIN_URL}`);

      // Should redirect to login or show login form
      await page.waitForURL(/login|auth/, { timeout: 10_000 }).catch(() => {});

      const hasLoginHeading = await page
        .getByRole("heading", { name: /login|sign in|admin/i })
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasEmailField = await page
        .getByRole("textbox", { name: /email/i })
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      expect(hasLoginHeading || hasEmailField).toBeTruthy();
    },
  );

  test(
    "admin login form has email and password fields",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      await page.goto(`${ADMIN_URL}/login`);

      await expect(
        page.getByRole("textbox", { name: /email/i }),
      ).toBeVisible({ timeout: 8_000 });

      await expect(
        page.getByRole("textbox", { name: /password/i }),
      ).toBeVisible();

      await expect(
        page.getByRole("button", { name: /sign in/i }),
      ).toBeVisible();
    },
  );

  test(
    "admin markets page requires authentication",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      await page.goto(`${ADMIN_URL}/admin/markets`);

      // Should redirect to login when not authenticated
      await page.waitForURL(/login|auth/, { timeout: 10_000 });
      expect(page.url()).toMatch(/login|auth/);
    },
  );

  test(
    "admin dashboard requires authentication",
    { tag: ["@regression", "@compliance"] },
    async ({ page }) => {
      await page.goto(`${ADMIN_URL}/admin/dashboard`);

      await page.waitForURL(/login|auth/, { timeout: 10_000 });
      expect(page.url()).toMatch(/login|auth/);
    },
  );
});
