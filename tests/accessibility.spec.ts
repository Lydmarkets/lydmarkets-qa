import { test, expect } from "../fixtures/base";
test.describe("Accessibility (a11y) tests", () => {
  test("homepage has headings in the page", async ({ page }) => {
    await page.goto("/");
    // Homepage uses h2/h3 for market cards — H1 is on interior pages
    const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();
    expect(headings.length).toBeGreaterThan(0);
  });

  test("interior pages have an H1", async ({ page }) => {
    await page.goto("/leaderboard");
    const h1 = await page.locator("h1").count();
    expect(h1).toBeGreaterThan(0);
  });

  test("all images have alt text", async ({ page }) => {
    await page.goto("/");
    const images = await page.locator("img").all();
    for (const img of images) {
      const alt = await img.getAttribute("alt");
      expect(alt).not.toBeNull();
    }
  });

  test("all interactive elements are keyboard accessible", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test("links have descriptive text or aria-label", async ({ page }) => {
    await page.goto("/");
    const links = await page.locator("a").all();
    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute("aria-label");
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });

  test("text has readable font sizes", async ({ page }) => {
    await page.goto("/");
    // Wait for the home content to render so computed styles are stable.
    // Without this, the first call sometimes raced React hydration on a
    // not-yet-styled element and returned a sub-10px size, causing flakes.
    await expect(
      page.getByRole("heading", { name: /utvalda|featured|vad tycker du|what do you think/i }).first()
    ).toBeAttached({ timeout: 10_000 });

    // Restrict to paragraphs and headings — decorative spans/links (badges,
    // count pills, tag chips) intentionally use smaller type. 10px is the
    // absolute floor for body/heading copy per the in-house a11y checklist.
    // Skip visually-hidden helpers (sr-only h2 in the carousel etc.) since
    // they're for assistive tech and intentionally collapsed in layout.
    const offenders = await page.locator("p, h2, h3").evaluateAll((els) =>
      els
        .filter((e) => {
          const r = (e as HTMLElement).getBoundingClientRect();
          // Visually-hidden / not-rendered elements are exempt.
          return r.width > 0 && r.height > 0;
        })
        .slice(0, 10)
        .map((e) => ({
          tag: e.tagName,
          text: e.textContent?.trim().slice(0, 60) ?? "",
          fontSize: parseFloat(window.getComputedStyle(e).fontSize),
        }))
        .filter((info) => info.fontSize < 10),
    );
    expect(offenders, `Found text elements below 10px: ${JSON.stringify(offenders)}`).toEqual([]);
  });

  test("buttons on login page expose an accessible name", async ({ page }) => {
    // Login uses BankID — no standard form inputs. Register has no text inputs
    // either. Verify every <button> element on the login page exposes either
    // visible text, an aria-label, an aria-labelledby reference, or a title.
    // (The previous version only checked text + aria-label and missed buttons
    // that label themselves via aria-labelledby — produces false positives on
    // the editorial layout where the ansvarsspel-bar pills compose labels
    // from sibling spans.)
    await page.goto("/login");
    const accessibleNames = await page.evaluate(() => {
      const namesByMissing: { html: string }[] = [];
      const buttons = Array.from(document.querySelectorAll("button"));
      for (const btn of buttons) {
        // Skip buttons explicitly hidden from the accessibility tree —
        // includes the UserMenu drawer scrim, which is a presentational
        // <button aria-hidden="true" tabindex="-1"> backdrop and is not
        // exposed to assistive tech.
        if (btn.getAttribute("aria-hidden") === "true") continue;

        const text = btn.textContent?.trim() ?? "";
        const aria = btn.getAttribute("aria-label") ?? "";
        const labelledBy = btn.getAttribute("aria-labelledby") ?? "";
        const title = btn.getAttribute("title") ?? "";
        let labelledText = "";
        if (labelledBy) {
          labelledText = labelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
            .join(" ");
        }
        const accessibleName = text || aria || labelledText || title;
        if (!accessibleName) {
          namesByMissing.push({ html: btn.outerHTML.slice(0, 200) });
        }
      }
      return { count: buttons.length, missing: namesByMissing };
    });

    expect(accessibleNames.count).toBeGreaterThan(0);
    expect(
      accessibleNames.missing,
      `Buttons without accessible name: ${JSON.stringify(accessibleNames.missing)}`,
    ).toEqual([]);
  });

  test("page has proper lang attribute", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });
});
