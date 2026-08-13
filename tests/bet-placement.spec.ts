import { test, expect } from "../fixtures/base";
import { goToFirstMarket } from "../helpers/go-to-market";
import { MOBILE_VIEWPORT } from "../helpers/order-form";

// The market buy buttons are now labelled `YES — {pct}% — {odds}×` /
// `NO — {pct}% — {odds}×` (English EUR bot build). The old `Köp ja / Buy yes`
// accessible names no longer exist, so the shared order-form triggers are
// stale — define local triggers that match the new leading `YES` / `NO`.
function getQuickBetYesTrigger(page: import("@playwright/test").Page) {
  return page.getByRole("button", { name: /^YES\b/ }).first();
}

function getQuickBetNoTrigger(page: import("@playwright/test").Page) {
  return page.getByRole("button", { name: /^NO\b/ }).first();
}

/**
 * Bet placement — QuickBet modal E2E tests
 *
 * Tests the bet-placement surfaces on the QuickBetModal as it ships today:
 *   1. Opening the modal from the Yes/No StatBand cells on the detail page
 *   2. Stake input + 4 preset buttons in kr (amounts scale with the
 *      `NEXT_PUBLIC_MIN_STAKE_SEK` env — see PRESET_BUTTON_RE below)
 *   3. Payout breakdown: Plattformsavgift toggle → Insats / Ordersumma /
 *      Möjlig utbetalning rows
 *   4. Unauthenticated → "Logga in" / "Log in" link
 *   5. Modal dismissal via Escape (the modal renders with
 *      `showCloseButton={false}`)
 *   6. Terms-agreement footer linking to /terms
 *
 * The old "Buy/Köp" header, separate Min/Max stake line, dedicated "Other"
 * preset toggle, and the combined "Fee & settlement" disclosure have all been
 * removed by the QuickBet redesign — tests for those surfaces were deleted.
 */

// Preset amounts scale with `NEXT_PUBLIC_MIN_STAKE_SEK`:
//   - <=10 → [10, 25, 50, 100]
//   - >10  → [MIN, MIN*2, MIN*5, MIN*10] (e.g. 50 → [50, 100, 250, 500])
// The currency prefix/suffix differs per build — the English bot build renders
// "€10" (the old mixed kr/€ i18n bug is fixed) while the Swedish build renders
// "10 kr". Match either shape rather than hard-coding amounts or a currency.
const PRESET_BUTTON_RE = /^(€\s*\d+|\d+\s*kr)$/i;

// Order submission moved from `/api/v2/orders` to `/api/v2/book/orders`. The
// old glob silently matched nothing, so the mock never fired: the "captured
// payload" assertion saw `null` while the bet went through to the real backend.
const ORDERS_ENDPOINT = "**/api/v2/book/orders";

async function openQuickBetYes(page: import("@playwright/test").Page) {
  const yesBtn = getQuickBetYesTrigger(page);
  await expect(yesBtn).toBeVisible({ timeout: 8_000 });
  await yesBtn.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  // Click the first preset (smallest) so the payout breakdown populates and the
  // Place CTA leaves its disabled (stake = 0) state. Deliberately NOT wrapped in
  // a `.catch()`: silently swallowing this made a stale preset selector surface
  // as four unrelated "Place button never became enabled" timeouts instead of
  // one obvious failure.
  await dialog.getByRole("button", { name: PRESET_BUTTON_RE }).first().click();
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
      // Side confirmation reads "You are buying YES" / "...JA".
      await expect(
        dialog.getByText(/buying\s+(ja|yes)\b/i).first(),
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
      // Side confirmation reads "You are buying NO" / "...NEJ".
      await expect(
        dialog.getByText(/buying\s+(nej|no)\b/i).first(),
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
    "modal shows four amount preset buttons",
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

  // Regression guard for a fixed bug: the payout breakdown used to freeze at
  // whatever was first computed, so switching presets moved only the stake
  // <input> while the fee and payout stayed stale — a user could read a payout
  // that did not belong to the stake they were about to place. Re-verified
  // reactive on web-bot 2026-08-13.
  test(
    "clicking a different preset updates the payout breakdown",
    { tag: ["@trading", "@compliance"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");
      const presets = dialog.getByRole("button", { name: /^(€\s*\d+|\d+\s*kr)$/i });
      await expect(presets).toHaveCount(4);

      // The label and its amount sit in sibling nodes, so read the payout out of
      // the dialog's rendered text rather than off a single element.
      const readPayout = async () => {
        const text = await dialog.innerText();
        return /(?:möjlig utbetalning|potential payout)\s*\+?\s*(?:€|kr)?\s*([\d.,]+)/i
          .exec(text)?.[1] ?? "";
      };

      const readings: string[] = [];
      for (const i of [0, 1, 2, 3]) {
        await presets.nth(i).click();
        // Each preset must settle on a payout that differs from the previous
        // one — a frozen breakdown repeats the same value.
        await expect.poll(readPayout, { timeout: 10_000 }).not.toBe(readings.at(-1) ?? "");
        readings.push(await readPayout());
      }

      expect(readings.every((r) => r !== "")).toBe(true);
      expect(new Set(readings).size).toBe(4);
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
      await expect(feeToggle).toBeVisible({ timeout: 10_000 });

      await expect(feeToggle).toHaveAttribute("aria-expanded", "false");

      // Expand
      await feeToggle.click();
      await expect(feeToggle).toHaveAttribute("aria-expanded", "true");

      // Three breakdown rows: English bot build labels them
      //   "Stake" / "Order amount" / "Potential payout". Labels share a node
      //   with their value (e.g. "Order amount €9.14"), so no ^$ anchors.
      await expect(
        dialog.getByText(/insats|stake/i).first(),
      ).toBeVisible({ timeout: 3_000 });
      await expect(
        dialog.getByText(/ordersumma|order amount/i).first(),
      ).toBeVisible();
      await expect(
        dialog.getByText(/möjlig utbetalning|potential payout/i).first(),
      ).toBeVisible();

      // Collapse
      await feeToggle.click();
      await expect(feeToggle).toHaveAttribute("aria-expanded", "false");
    },
  );

  // The SEK-only assertion that used to sit here was deleted rather than left
  // permanently skipped: the bot build is a EUR play-money demo, and the
  // currency contract that matters on every build — one currency, consistently
  // — is asserted below.
  test(
    "modal renders a single, consistent currency across all amounts",
    { tag: ["@trading", "@compliance"] },
    async ({ page }) => {
      // The original mixed kr/€ i18n bug is fixed, so this guards against it
      // regressing: whichever currency the build uses, it must not mix the two,
      // and every amount in the dialog must carry it.
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const text = await page.getByRole("dialog").innerText();
      const hasKr = /\d\s*kr\b/i.test(text);
      const hasEur = /€\s*\d/.test(text);

      expect(hasKr || hasEur).toBeTruthy();
      expect(hasKr && hasEur).toBeFalsy();
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
      await expect(feeToggle).toBeVisible({ timeout: 10_000 });

      // The toggle's label embeds "(X%)" — assert a percentage appears.
      const text = (await feeToggle.innerText()).trim();
      expect(text).toMatch(/\d[.,]?\d*\s*%/);
    },
  );

  // ─────────────────────────────────────────────────────────────────
  // 4. UNAUTHENTICATED STATE
  // ─────────────────────────────────────────────────────────────────

  test(
    "unauthenticated dialog footer surfaces a log-in CTA",
    { tag: ["@trading", "@smoke"] },
    async ({ page }) => {
      await goToFirstMarket(page);
      await openQuickBetYes(page);

      const dialog = page.getByRole("dialog");

      // Logged-out, the place-order CTA renders as a button "Log in to place
      // bet" (`markets.signInToBuy`) that routes to /login on click — it is no
      // longer a plain anchor with an href, so assert the button is present.
      const loginCta = dialog.getByRole("button", {
        name: /logga in|log in/i,
      });
      await expect(loginCta.first()).toBeVisible({ timeout: 5_000 });
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

      // "Terms of Use" link — href is locale-prefixed on the bot build
      // (`/en/terms`), so assert the path suffix rather than an exact match.
      const termsLink = dialog.getByRole("link", {
        name: /användarvillkor|terms of use|terms/i,
      });
      await expect(termsLink.first()).toBeVisible();
      const href = await termsLink.first().getAttribute("href");
      expect(href).toMatch(/\/terms$/);
    },
  );

  // ─────────────────────────────────────────────────────────────────
  // 6. AUTHENTICATED BET PLACEMENT
  // ─────────────────────────────────────────────────────────────────

  test.describe("authenticated — place a bet", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test.beforeEach(async ({ page }) => {
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

        // An authenticated user gets the Place CTA, never the guest sign-in link.
        await expect(signInLink).toHaveCount(0);
        await expect(placeBtn.first()).toBeVisible({ timeout: 10_000 });
      },
    );

    test(
      "placing a bet sends POST to the book-orders endpoint and shows the receipt",
      { tag: ["@trading", "@critical"] },
      async ({ page }) => {
        let capturedBody: Record<string, unknown> | null = null;
        await page.route(ORDERS_ENDPOINT, async (route) => {
          const request = route.request();
          // The order book is fetched with a GET on this same path — only the
          // submission is a POST, so let everything else through untouched.
          if (request.method() !== "POST") return route.fallback();
          capturedBody = JSON.parse(request.postData() || "{}");
          const quantity = Number(capturedBody?.quantity ?? 20);
          const limitPrice = Number(capturedBody?.limitPrice ?? 0.5);
          // Must mirror `BookOrderPlacement` in the web app's TradeSlip — the
          // client reads `res.json()` straight through with no envelope, so a
          // wrong-shaped body renders no receipt at all.
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              bookOrderId: "mock-order-123",
              marketId: capturedBody?.marketId,
              side: capturedBody?.side,
              type: capturedBody?.type ?? "buy",
              limitPrice,
              quantity,
              filledQuantity: quantity,
              status: "filled",
              heldOre: 0,
              lockedShares: 0,
              goodTill: null,
              fills: [{ qty: quantity, price: limitPrice }],
              feeOre: 0,
              totalCostOre: Math.round(quantity * limitPrice * 100),
            }),
          });
        });

        await goToFirstMarket(page);
        await openQuickBetYes(page);

        const dialog = page.getByRole("dialog");
        const placeBtn = dialog.getByRole("button", { name: /^(placera|place)\b/i }).first();
        await expect(placeBtn).toBeVisible({ timeout: 10_000 });

        await placeBtn.click();

        // Receipt drawer takes over the modal on success — its title is
        // `receipts.drawer.title`, rendered as the dialog's accessible name.
        // Deliberately NOT a loose /order|receipt/ page-text match: that also
        // hits "Order type" / "Order amount" / "Order book" in the still-open
        // bet modal, so it passed even when no order was ever submitted.
        await expect(
          page.getByRole("dialog", { name: /order receipt|orderkvitto/i }),
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
        await page.route(ORDERS_ENDPOINT, async (route) => {
          if (route.request().method() !== "POST") return route.fallback();
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
        await expect(placeBtn).toBeVisible({ timeout: 10_000 });

        await placeBtn.click();

        // Modal should remain open so the user can retry or cancel.
        await expect(page.getByRole("dialog")).toBeVisible();
      },
    );
  });
});
