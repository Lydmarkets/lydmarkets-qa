import { test, expect } from "../fixtures/base";

// The age gate modal shows "Åldersbekräftelse" with two buttons:
// "Jag är 18 år eller äldre" (confirm) and "Lämna sidan" (leave).
// There is no date-of-birth input — it is a simple confirmation modal.

test.describe("Age verification gate flow", () => {
  test("modal appears for unauthenticated users on homepage", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /åldersbekräftelse/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /jag är 18/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /lämna sidan/i })).toBeVisible();
  });

  test("confirming age dismisses the modal", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");

    await expect(page.getByRole("button", { name: /jag är 18/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /jag är 18/i }).click();

    await expect(page.getByRole("heading", { name: /åldersbekräftelse/i })).not.toBeVisible({ timeout: 5000 });
  });

  test("main content is accessible after confirming age", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");

    await page.getByRole("button", { name: /jag är 18/i }).waitFor({ state: "visible", timeout: 5000 });
    await page.getByRole("button", { name: /jag är 18/i }).click();

    await expect(page.locator("main")).toBeVisible({ timeout: 5000 });
  });

  test("modal does not reappear after confirming (cookie persists on reload)", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");

    await page.getByRole("button", { name: /jag är 18/i }).waitFor({ state: "visible", timeout: 5000 });
    await page.getByRole("button", { name: /jag är 18/i }).click();
    await expect(page.getByRole("heading", { name: /åldersbekräftelse/i })).not.toBeVisible({ timeout: 5000 });

    await page.reload();

    const modal = page.getByRole("heading", { name: /åldersbekräftelse/i });
    const isVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isVisible).toBe(false);
  });

  test("modal does not reappear when navigating between pages", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");

    await page.getByRole("button", { name: /jag är 18/i }).waitFor({ state: "visible", timeout: 5000 });
    await page.getByRole("button", { name: /jag är 18/i }).click();
    await expect(page.getByRole("heading", { name: /åldersbekräftelse/i })).not.toBeVisible({ timeout: 5000 });

    await page.goto("/leaderboard");
    const isVisible = await page.getByRole("heading", { name: /åldersbekräftelse/i }).isVisible({ timeout: 3000 }).catch(() => false);
    expect(isVisible).toBe(false);
  });

  test("modal blocks background interaction until dismissed", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Try clicking outside the modal — it should remain visible
    await page.locator("body").click({ position: { x: 10, y: 10 } });
    await expect(modal).toBeVisible();
  });

  test("leave page button is present as an alternative", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");

    await expect(page.getByRole("button", { name: /lämna sidan/i })).toBeVisible({ timeout: 5000 });
  });

  test("modal does not appear when age cookie is already set", async ({ page, context, baseURL }) => {
    // Extract domain from the baseURL dynamically
    const domain = new URL(baseURL ?? "https://web-production-bb35.up.railway.app").hostname;
    // Set the cookie directly before navigating
    await context.addCookies([{
      name: "age_verified",
      value: "1",
      domain,
      path: "/",
    }]);

    await page.goto("/");

    const isVisible = await page.getByRole("heading", { name: /åldersbekräftelse/i }).isVisible({ timeout: 3000 }).catch(() => false);
    expect(isVisible).toBe(false);
  });
});
