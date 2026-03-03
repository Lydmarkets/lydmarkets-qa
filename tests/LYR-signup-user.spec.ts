import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

const UNIQUE = Date.now();

test.describe("User signup", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
    await dismissAgeGate(page);
  });

  test("signup page renders the registration form", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Create an account" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByLabel("Confirm password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create account" }),
    ).toBeVisible();
  });

  test("successful signup redirects to /login?registered=1", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill(`qa+${UNIQUE}@example.com`);
    await page.getByLabel("Password").fill("Password123!");
    await page.getByLabel("Confirm password").fill("Password123!");

    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL(/\/login\?registered=1/, { timeout: 15_000 });
  });

  test("shows error when passwords do not match", async ({ page }) => {
    await page.getByLabel("Email").fill(`qa+${UNIQUE}@example.com`);
    await page.getByLabel("Password").fill("Password123!");
    await page.getByLabel("Confirm password").fill("Different999!");

    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("alert")).toContainText(
      "Passwords do not match.",
    );
  });

  test("shows error when password is too short", async ({ page }) => {
    await page.getByLabel("Email").fill(`qa+${UNIQUE}@example.com`);
    await page.getByLabel("Password").fill("short");
    await page.getByLabel("Confirm password").fill("short");

    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("alert")).toContainText(
      "Password must be at least 8 characters.",
    );
  });

  test("submit button shows loading state while request is in flight", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill(`qa+loading${UNIQUE}@example.com`);
    await page.getByLabel("Password").fill("Password123!");
    await page.getByLabel("Confirm password").fill("Password123!");

    await page.route("**/api/auth/register", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.continue();
    });

    await page.getByRole("button", { name: "Create account" }).click();

    await expect(
      page.getByRole("button", { name: "Creating account…" }),
    ).toBeVisible();
  });

  test("sign in link navigates to /login", async ({ page }) => {
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
