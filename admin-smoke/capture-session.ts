/**
 * Step 1 of the admin smoke harness — capture an authenticated session.
 *
 * The admin panel enforces email + password + TOTP MFA, so there is no
 * headless login path. This opens a real Chromium window, waits for a human
 * to log in, then snapshots the session cookies to `admin-auth.json` for the
 * crawl step to reuse.
 *
 *   ADMIN_BASE_URL=https://admin.lydmarkets.se bun admin-smoke/capture-session.ts
 *
 * Requires an X11/Wayland display (it launches a headed browser).
 */
import { chromium } from "@playwright/test";

const BASE = process.env.ADMIN_BASE_URL ?? "https://admin.lydmarkets.se";
const AUTH_FILE = `${import.meta.dir}/admin-auth.json`;
const TIMEOUT_MS = 10 * 60 * 1000;

function log(msg: string) {
  console.log(`[capture] ${msg}`);
}

const browser = await chromium.launch({ headless: false, args: ["--start-maximized"] });
const context = await browser.newContext({ viewport: null });
const page = await context.newPage();

log(`Opening ${BASE}/login — log in + complete MFA in the window.`);
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" }).catch((e) => {
  log(`initial goto warning: ${e.message}`);
});

console.log("\n========================================================");
console.log("  >>> LOG IN NOW in the Chromium window on your screen.");
console.log("  >>> Enter email + password + TOTP. The session is detected automatically.");
console.log("========================================================\n");

const deadline = Date.now() + TIMEOUT_MS;
let captured = false;
let tick = 0;

while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 2000));
  tick++;
  let cookies;
  try {
    cookies = await context.cookies();
  } catch {
    continue; // context mid-navigation
  }
  const session = cookies.find((c) => c.name.includes("authjs.session-token"));
  const url = page.url();
  const offLogin = !url.includes("/login") && url.startsWith(BASE);
  if (tick % 5 === 0) {
    log(`heartbeat: url=${url} sessionCookie=${session ? "yes" : "no"} cookies=${cookies.length}`);
  }
  if (session && offLogin) {
    log(`Session cookie detected (${session.name}); current url: ${url}`);
    await new Promise((r) => setTimeout(r, 2500)); // let post-login redirects/cookies settle
    await context.storageState({ path: AUTH_FILE });
    log(`Saved session -> ${AUTH_FILE}`);
    captured = true;
    break;
  }
}

await browser.close();

if (!captured) {
  log("TIMED OUT waiting for login — no session captured.");
  process.exit(2);
}
log("DONE — session captured. Run: bun admin-smoke/crawl.ts");
process.exit(0);
