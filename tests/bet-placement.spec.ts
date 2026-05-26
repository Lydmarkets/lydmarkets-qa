import { test, expect } from "../fixtures/base";
import { goToFirstMarket } from "../helpers/go-to-market";
import { hasAuthSession } from "../helpers/has-auth";
import {
  MOBILE_VIEWPORT,
  getQuickBetNoTrigger,
  getQuickBetYesTrigger,
} from "../helpers/order-form";

/**
 * Bet placement — QuickBet modal E2E tests
 *
 * Tests the bet-placement surfaces on the QuickBetModal as it ships today:
 *   1. Opening the modal from the Yes/No StatBand cells on the detail page
 *   2. Stake input + 4 preset buttons (10 / 25 / 50 / 100 kr)
 *   3. Payout breakdown: Plattformsavgift toggle → Insats / Ordersumma /
 *      Möjlig utbetalning rows
 *   4. Unauthenticated → "Logga in" / "Sign in" link
 *   5. Modal close behaviour
 *   6. Terms-agreement footer linking to /terms
 *
 * The old "Buy/Köp" header, separate Min/Max stake line, dedicated "Other"
 * preset toggle, and the combined "Fee & settlement" disclosure have all been
 * removed by the QuickBet redesign — tests for those surfaces were deleted.
 */

// Preset amounts scale with `NEXT_PUBLIC_MIN_STAKE_SEK`:
//   - <=10 → [10, 25, 50, 100] kr
//   - >10  → [MIN, MIN*2, MIN*5, MIN*10] (e.g. 50 → [50, 100, 250, 500])
// Match any "<digits> kr" preset button rather than hard-coding amounts.
const PRESET_BUTTON_RE = /^\d+\s*kr$/i;

async function openQuickBetYes(page: import("@playwright/test").Page) {
  const yesBtn = getQuickBetYesTrigger(page);
  await expect(yesBtn).toBeVisible({ timeout: 8_000 });
  await yesBtn.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  // Click the first preset (smallest) so the payout breakdown populates.
  await dialog
    .getByRole("button", { name: PRESET_BUTTON_RE })
    .first()
    .click()
    .catch(() => {});
}

// QuickBetModal is the mobile-only entry point on the detail page.
// Desktop opens the same modal from the inline market detail StatBand cells
// (SCRUM-1141 removed the desktop side-rail TradePanel) but the dialog is
// the same. Mobile viewport guarantees the StatBand triggers are active.
test.describe("Bet placement — QuickBet modal", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  // ─────────────────────────────────────────────────────────────────
  // 1. OPENING THE MODAL
  // ─────────────────────────────────────────────────────────────────

  test(
    "clicking YES button opens QuickBet modal with the Yes side badge",
    { tag: ["@trading", "@smoke"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");
      // Side badge text is `markets.yes` = "Ja" / "Yes".
      await expect(
        dialog.getByText(/^(ja|yes)$/i).first(),
      ).toBeVisible();
    },
  );

  test(
    "clicking NO button opens QuickBet modal with the No side badge",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);

      const noBtn = getQuickBetNoTrigger(page);
      await expect(noBtn).toBeVisible({ timeout: 8_000 });
      await noBtn.click();

      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });

      const dialog = page.getByRole("dialog");
      // Side badge text is `markets.no` = "Nej" / "No".
      await expect(
        dialog.getByText(/^(nej|no)$/i).first(),
      ).toBeVisible();
    },
  );

  test(
    "QuickBet modal displays the market title",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);

      // Grab the h1 market title before opening modal
      const h1 = page.getByRole("heading", { level: 1 });
      const marketTitle = await h1.textContent();

      await openQuickBetYes(page);

      // The modal should show the market title (possibly truncated)
      const dialog = page.getByRole("dialog");
      const firstWord = marketTitle!.trim().split(/\s+/)[0];
      await expect(dialog.getByText(firstWord)).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    "pressing Escape dismisses the QuickBet modal",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      // QuickBetModal renders with `showCloseButton={false}` — there is no
      // visible "X" / "Close" button. Dismissal is by Escape, backdrop click,
      // or the receipt-drawer close after a placed order. Escape is the
      // accessibility-baseline behaviour.
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 3_000 });
    },
  );

  // ─────────────────────────────────────────────────────────────
  // 2. AMOUNT INPUT + PRESETS
  // ─────────────────────────────────────────────────────────────

  test(
    "modal shows four amount preset buttons in kr",
    { tag: ["@trading", "@smoke"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");
      const presets = dialog.getByRole("button", { name: PRESET_BUTTON_RE });
      await expect(presets).toHaveCount(4);
      for (const i of [0, 1, 2, 3]) {
        await expect(presets.nth(i)).toBeVisible();
      }
    },
  );

  test(
    "custom amount input accepts numeric values",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");
      // The stake input is rendered as `<input type="number">` and exposes
      // role=spinbutton. Aria-label is `markets.enterAmount`.
      const input = dialog.getByRole("spinbutton").first();
      await expect(input).toBeVisible({ timeout: 3_000 });
      await input.fill("200");
      await expect(input).toHaveValue("200");
    },
  );

  test(
    "clicking a different preset updates the payout breakdown",
    { tag: ["@trading"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");

      const feeToggle = dialog.getByRole("button", {
        name: /plattformsavgift|platform fee/i,
      });
      const hasBreakdown = await feeToggle
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      if (!hasBreakdown) {
        test.skip(true, "Market has 0 stake limits — no breakdown available");
        return;
      }

      const feeBefore = await feeToggle.textContent();

      // Switch to a different preset (use the last one so the absolute fee
      // amount visibly differs from the first preset clicked by openQuickBetYes).
      const presets = dialog.getByRole("button", { name: PRESET_BUTTON_RE });
      await presets.last().click();

      // Fee row should have updated (different absolute fee amount)
      await expect(async () => {
        const feeAfter = await feeToggle.textContent();
        expect(feeAfter).not.toBe(feeBefore);
      }).toPass({ timeout: 5_000 });
    },
  );

  // ─────────────────────────────────────────────────────────────
  // 3. PAYOUT BREAKDOWN (GAEAB Ch.11 / LIFS 2018:8)
  // ─────────────────────────────────────────────────────────────

  test(
    "platform fee toggle expands to show Insats / Ordersumma / Möjlig utbetalning",
    { tag: ["@trading", "@compliance", "@critical"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");

      const feeToggle = dialog.getByRole("button", {
        name: /plattformsavgift|platform fee/i,
      });
      const hasFee = await feeToggle
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      if (!hasFee) {
        test.skip(true, "Market has 0 stake limits — no breakdown available");
        return;
      }

      await expect(feeToggle).toHaveAttribute("aria-expanded", "false");

      // Expand
      await feeToggle.click();
      await expect(feeToggle).toHaveAttribute("aria-expanded", "true");

      // Three breakdown rows render only when expanded:
      //   - `markets.kostnad`     = "Insats"
      //   - `markets.insats`      = "Ordersumma"
      //   - `markets.mojligVinst` = "Möjlig utbetalning"
      await expect(
        dialog.getByText(/^insats$|^stake$/i).first(),
      ).toBeVisible({ timeout: 3_000 });
      await expect(
        dialog.getByText(/^ordersumma$|^order amount$/i).first(),
      ).toBeVisible();
      await expect(
        dialog.getByText(/möjlig utbetalning|possible payout/i).first(),
      ).toBeVisible();

      // Collapse
      await feeToggle.click();
      await expect(feeToggle).toHaveAttribute("aria-expanded", "false");
    },
  );

  test(
    "all amounts in modal are displayed in SEK (kr)",
    { tag: ["@trading", "@compliance"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");
      const text = await dialog.innerText();

      // At minimum the four preset buttons each surface "kr". Realistic
      // dialogs render more (input suffix, fee row, etc.).
      const krMatches = text.match(/kr/gi) || [];
      expect(krMatches.length).toBeGreaterThanOrEqual(4);
    },
  );

  test(
    "platform fee toggle shows the fee percentage",
    { tag: ["@trading", "@compliance"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");

      const feeToggle = dialog.getByRole("button", {
        name: /plattformsavgift|platform fee/i,
      });
      const hasFee = await feeToggle
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      if (!hasFee) {
        test.skip(true, "Market has 0 stake limits — no breakdown available");
        return;
      }

      // The toggle's label embeds "(X%)" — assert a percentage appears.
      const text = (await feeToggle.innerText()).trim();
      expect(text).toMatch(/\d[.,]?\d*\s*%/);
    },
  );

  // ─────────────────────────────────────────────────────────────────
  // 4. UNAUTHENTICATED STATE
  // ─────────────────────────────────────────────────────────────────

  test(
    "unauthenticated dialog footer surfaces a sign-in link to /login",
    { tag: ["@trading", "@smoke"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");

      // `markets.signInToBuy` renders as "Logga in" / "Log in" on a Link to
      // `/login?next=/markets/...`. Match either locale's wording (English
      // copy uses "Log in", not "Sign in").
      const signInLink = dialog.getByRole("link", {
        name: /^(logga in|log in|sign in)$/i,
      });
      await expect(signInLink).toBeVisible({ timeout: 5_000 });

      const href = await signInLink.getAttribute("href");
      expect(href).toMatch(/\/login(\?|$)/);
    },
  );

  // ─────────────────────────────────────────────────────────────────
  // 5. TERMS AGREEMENT FOOTER
  // ─────────────────────────────────────────────────────────────────

  test(
    "modal footer shows terms agreement with link to /terms",
    { tag: ["@trading", "@compliance"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");

      // `markets.termsAgree` = "Genom att handla godkänner du" /
      // "By trading you agree to".
      await expect(
        dialog.getByText(/genom att handla.*godkänner|by trading.*agree/i),
      ).toBeVisible({ timeout: 5_000 });

      // `markets.termsOfUse` = "Användarvillkoren" / "Terms of Use" — the
      // visible label on the link to `/terms`.
      const termsLink = dialog.getByRole("link", {
        name: /användarvillkor|terms of use|terms/i,
      });
      await expect(termsLink).toBeVisible();
      const href = await termsLink.getAttribute("href");
      expect(href).toBe("/terms");
    },
  );

  // ─────────────────────────────────────────────────────────────────
  // 6. AUTHENTICATED BET PLACEMENT
  // ─────────────────────────────────────────────────────────────────

  test.describe("authenticated — place a bet", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test.beforeEach(async ({ page }, testInfo) => {
      if (!hasAuthSession()) testInfo.skip();
      // Mock wallet balance so the CTA is enabled.
      await page.route("**/api/v2/wallet", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { balance: "10000.00", lockedBalance: "0.00", currency: "SEK" } }),
        });
      });
    });

    test(
      "Place-order CTA is visible for authenticated user",
      { tag: ["@trading", "@smoke"] },
      async ({ page }) => {
        await goToFirstMarket(page);
        await openQuickBetYes(page);

        const dialog = page.getByRole("dialog");

        // Authenticated CTA: `markets.ctaPlace` renders as "Placera {amount}" /
        // "Place {amount}" — match the leading verb.
        const placeBtn = dialog.getByRole("button", {
          name: /^(placera|place)\b/i,
        });
        const signInLink = dialog.getByRole("link", {
          name: /^(logga in|log in|sign in)$/i,
        });

        const hasPlace = await placeBtn
          .first()
          .isVisible({ timeout: 5_000 })
          .catch(() => false);
        const hasSignIn = await signInLink
          .isVisible({ timeout: 2_000 })
          .catch(() => false);

        if (!hasPlace && hasSignIn) {
          test.skip(true, "Auth session expired — user sees sign-in link");
          return;
        }

        await expect(placeBtn.first()).toBeVisible();
      },
    );

    test(
      "placing a bet sends POST to /api/v2/orders and shows the receipt",
      { tag: ["@trading", "@critical"] },
      async ({ page }) => {
        let capturedBody: Record<string, unknown> | null = null;
        await page.route("**/api/v2/orders", async (route) => {
          const request = route.request();
          capturedBody = JSON.parse(request.postData() || "{}");
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              orderId: "mock-order-123",
              status: "filled",
              side: capturedBody?.side,
              avgPrice: 0.5,
              quantity: 20,
            }),
          });
        });

        await goToFirstMarket(page);
        await openQuickBetYes(page);

        const dialog = page.getByRole("dialog");
        const placeBtn = dialog.getByRole("button", { name: /^(placera|place)\b/i }).first();
        const hasPlace = await placeBtn.isVisible({ timeout: 5_000 }).catch(() => false);
        if (!hasPlace) {
          test.skip(true, "Auth session expired — Place button not visible");
          return;
        }

        await placeBtn.click();

        // Receipt drawer takes over the modal on success — its title is
        // `receipts.drawer.title`. Match any of the receipt-style copy.
        await expect(
          page.getByText(/order|kvitto|receipt|mottagen|received|placed/i).first(),
        ).toBeVisible({ timeout: 10_000 });

        // Verify the API was called with correct payload
        expect(capturedBody).not.toBeNull();
        expect(capturedBody!.side).toBe("yes");
        expect(capturedBody!.marketId).toBeTruthy();
      },
    );

    test(
      "API error keeps the modal open",
      { tag: ["@trading", "@critical"] },
      async ({ page }) => {
        await page.route("**/api/v2/orders", async (route) => {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ error: "Insufficient balance", code: "INSUFFICIENT_BALANCE" }),
          });
        });

        await goToFirstMarket(page);
        await openQuickBetYes(page);

        const dialog = page.getByRole("dialog");
        const placeBtn = dialog.getByRole("button", { name: /^(placera|place)\b/i }).first();
        const hasPlace = await placeBtn.isVisible({ timeout: 5_000 }).catch(() => false);
        if (!hasPlace) {
          test.skip(true, "Auth session expired");
          return;
        }

        await placeBtn.click();

        // Modal should remain open so the user can retry or cancel.
        await expect(page.getByRole("dialog")).toBeVisible();
      },
    );
  });
});
