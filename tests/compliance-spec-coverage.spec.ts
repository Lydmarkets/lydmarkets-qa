import { test, expect } from "../fixtures/base";
import { dismissLimitsDialog } from "../helpers/dismiss-limits-dialog";
import { IS_BOT_BUILD } from "../helpers/is-bot-build";

test.describe("Compliance spec — E2E coverage", () => {
  // ── Unauthenticated redirect tests ──────────────────────────────────

  // These use the plain `page` fixture, NOT a hand-rolled `browser.newContext()`.
  // The tests outside the "authenticated" describe below already run as a guest,
  // so the extra context was redundant — and it skipped fixtures/base, losing the
  // `locale=en` cookie and the seeded cookie consent. That is what made
  // "publicly accessible" the one hard failure on the VPS run: no seeded consent
  // means the banner renders and the page settles slower, and 10s was not enough
  // for the h1 under 2-worker load.
  test(
    "/responsible-gambling is publicly accessible",
    { tag: ["@compliance"] },
    async ({ page }) => {
      await page.goto("/responsible-gambling");
      // Public page — should NOT redirect to login
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator("main").last()).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByRole("heading", { name: /responsible gambling|ansvarsfullt spelande/i, level: 1 }),
      ).toBeVisible({ timeout: 20_000 });
    },
  );

  test(
    "legacy /settings/self-exclusion route is gone (404)",
    { tag: ["@compliance"] },
    async ({ page }) => {
      // The self-exclusion tool was promoted out of the (now removed) /settings
      // area to a top-level /self-exclusion route. The old nested path returns
      // 404 rather than redirecting to login.
      const response = await page.goto("/settings/self-exclusion");
      expect(response?.status()).toBe(404);
    },
  );

  // /disputes and /disputes/new routes were removed — disputes are now
  // handled by email (support@lydmarkets.se). KYC route removed earlier.

  // ── Authenticated tests ─────────────────────────────────────────────

  test.describe("authenticated", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    // ── Responsible gambling (public page) ─────────────────────────────

    test(
      "responsible gambling page shows support organisations",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/responsible-gambling");
        await dismissLimitsDialog(page);

        await expect(
          page.getByRole("heading", { name: /responsible gambling|ansvarsfullt spelande/i, level: 1 }),
        ).toBeVisible({ timeout: 10_000 });

        // Spelpaus survives on the bot build as "Bot Spelpaus"; Stödlinjen is
        // scrubbed to the fictional "Chatterly", so assert it on staging only.
        await expect(page.getByText(/spelpaus/i).first()).toBeVisible();
        if (!IS_BOT_BUILD) {
          await expect(page.getByText(/stödlinjen|stodlinjen/i).first()).toBeVisible();
        }
      },
    );

    test(
      "responsible gambling page links out to the helpline's self-test",
      { tag: ["@compliance"] },
      async ({ page }) => {
        // The inline 9-question PGSI form was replaced by a link to the
        // helpline-hosted PGSI test — the authoritative version. On the
        // licensed build that is Stödlinjen; the bot legislation build points
        // its scrubbed "Chatterly" helpline at a lydmarkets.com placeholder.
        // Either way the help card must offer a working way out to it.
        await page.goto("/responsible-gambling");
        await dismissLimitsDialog(page);

        await expect(
          page.getByRole("heading", { name: /stödlinjen|chatterly/i }).first(),
        ).toBeVisible({ timeout: 10_000 });

        const helpSection = page
          .getByRole("heading", { name: /help and support|hjälp och stöd/i })
          .locator("..");
        const externalLink = helpSection.getByRole("link", { name: /stodlinjen\.se|lydmarkets\.com/i });
        await expect(externalLink.first()).toHaveAttribute("href", /^https?:\/\//);
      },
    );

    test(
      "responsible gambling page shows platform tools linking to the limit controls",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/responsible-gambling");
        await dismissLimitsDialog(page);

        await expect(page.locator("main").last()).toBeVisible({ timeout: 10_000 });

        // The platform-tools cards used to point at a /settings route that
        // 404'd on this build; they now deep-link to the live controls at
        // /limits and /self-exclusion. Hrefs carry the active locale prefix
        // (e.g. `/en/limits`), so match the path suffix.
        const toolLinks = page.locator(
          'a[href$="/limits"], a[href$="/self-exclusion"], a[href$="/settings"]',
        );
        await expect(toolLinks.first()).toBeVisible({ timeout: 5_000 });
        expect(await toolLinks.count()).toBeGreaterThanOrEqual(1);
      },
    );

    test(
      "responsible gambling page has self-exclusion link",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/responsible-gambling");
        await dismissLimitsDialog(page);

        // Self-exclusion was promoted from /settings/self-exclusion to a
        // top-level /self-exclusion route. Hrefs carry the active locale prefix
        // on this build (e.g. `/en/self-exclusion`), so match anywhere in path.
        await expect(
          page.locator('a[href*="/self-exclusion"]').first(),
        ).toBeVisible({ timeout: 10_000 });
      },
    );

    // ── Self-exclusion ────────────────────────────────────────────────

    // Self-exclusion moved from /settings/self-exclusion (now 404) to the
    // top-level /self-exclusion route. The period chooser is revealed by the
    // "Exclude from Lydmarkets" control — the exclusion itself is only applied
    // by the second-step confirm button, which these tests never click.
    test(
      "self-exclusion page offers the full range of exclusion periods",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/self-exclusion");
        await dismissLimitsDialog(page);

        await expect(
          page.getByRole("heading", { name: /self-exclusion|självavstängning/i, level: 1 }),
        ).toBeVisible({ timeout: 15_000 });

        await page
          .getByRole("button", { name: /exclude from lydmarkets|stäng av mig/i })
          .click();

        // The <select> carries no aria-label — its "Select Exclusion Period"
        // caption is a sibling, not an associated <label> — so scope by role
        // within main rather than by accessible name.
        await expect(
          page.getByText(/select exclusion period|välj avstängningsperiod/i),
        ).toBeVisible({ timeout: 10_000 });
        const periods = page.locator("main").getByRole("combobox").first();
        await expect(periods).toBeVisible({ timeout: 10_000 });
        // SIFS 2019:2 requires short, medium and indefinite options.
        for (const option of [
          /24 hours|24 timmar/i,
          /1 month|1 månad/i,
          /3 months|3 månader/i,
          /6 months|6 månader/i,
          /indefinite|permanent|tills vidare/i,
        ]) {
          await expect(periods.getByRole("option", { name: option })).toHaveCount(1);
        }
      },
    );

    test(
      "self-exclusion page has two-step confirmation flow",
      { tag: ["@compliance"] },
      async ({ page }) => {
        await page.goto("/self-exclusion");
        await dismissLimitsDialog(page);

        await expect(
          page.getByRole("heading", { name: /self-exclusion|självavstängning/i, level: 1 }),
        ).toBeVisible({ timeout: 15_000 });

        // Irreversibility has to be stated before the user commits.
        await expect(
          page.getByText(/cannot be reversed|kan inte ångras/i).first(),
        ).toBeVisible();

        // Step 1 only reveals the period chooser…
        const step1 = page.getByRole("button", {
          name: /exclude from lydmarkets|stäng av mig/i,
        });
        await expect(step1).toBeVisible();
        await step1.click();

        // …step 2 is a separate, distinctly-named confirm control, so no single
        // click can self-exclude the user.
        await expect(
          page.locator("main").getByRole("combobox").first(),
        ).toBeVisible({ timeout: 10_000 });
        await expect(
          page.getByRole("button", { name: /^pause$|^pausa$|bekräfta|confirm/i }),
        ).toBeVisible();
      },
    );

    // Disputes route removed — disputes are now handled by email.
    // KYC route removed earlier.
  });
});
