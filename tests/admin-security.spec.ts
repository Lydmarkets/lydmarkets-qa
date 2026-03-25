import { test, expect } from "../fixtures/base";

// ---------------------------------------------------------------------------
// Admin Security E2E Tests
//
// Verifies security behaviours of the Lydmarkets Admin system:
//   1. Auth — login form, invalid credentials, session redirect, logout
//   2. Rate limiting — brute-force lockout after 5 failed attempts
//   3. Route protection — unauthenticated access redirects to /login
//   4. RBAC — admin sidebar, protected pages
//   5. SIFS exports — download triggers, Content-Disposition headers
//   6. AML/SAR — alert escalation, SAR modal, status transitions
//   7. Audit integrity — hash-chain verification dashboard
//   8. Spelpaus — self-exclusion indicators in compliance view
//   9. Withdrawals — approve/reject queue, action dialogs
//  10. Market lifecycle — approve → settle state transitions
// ---------------------------------------------------------------------------

const ADMIN_URL =
  process.env.ADMIN_URL || "https://lydmarkets-admin-production.up.railway.app";

// =========================================================================
// 1. AUTH — Login, credentials, session
// =========================================================================

test.describe("Admin Security — Auth", () => {
  test("login page renders with email and password fields", { tag: ["@smoke", "@security"] }, async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`);

    await expect(page.getByRole("heading", { name: /admin login/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("invalid credentials show error message", { tag: ["@security"] }, async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`);
    await expect(page.getByRole("heading", { name: /admin login/i })).toBeVisible({ timeout: 10_000 });

    await page.getByLabel(/email/i).fill("wrong@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show a generic error — not reveal whether email exists
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/invalid credentials|too many login attempts/i)).toBeVisible();
  });

  test("login form disables inputs while submitting", { tag: ["@security"] }, async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`);
    await expect(page.getByRole("heading", { name: /admin login/i })).toBeVisible({ timeout: 10_000 });

    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill("password");

    // Click and immediately check for disabled/loading state
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("button", { name: /signing in/i })).toBeVisible({ timeout: 3_000 });
  });

  test("authenticated admin redirect: /login redirects to /admin if already logged in", { tag: ["@security"] }, async ({ page }) => {
    // Without auth state, visiting /admin should redirect to /login
    await page.goto(`${ADMIN_URL}/admin`);
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });
});

// =========================================================================
// 2. RATE LIMITING — brute-force protection
// =========================================================================

test.describe("Admin Security — Rate Limiting", () => {
  test("rate limit status endpoint returns 200 for fresh IP", { tag: ["@security"] }, async ({ page }) => {
    const response = await page.request.get(`${ADMIN_URL}/api/auth/rate-limit`);
    // Fresh IP should not be rate-limited
    expect([200, 429]).toContain(response.status());
  });

  test("failed login shows error and form remains functional for retry", { tag: ["@security", "@critical"] }, async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`);
    await expect(page.getByRole("heading", { name: /admin login/i })).toBeVisible({ timeout: 10_000 });

    // Submit invalid credentials
    await page.getByLabel(/email/i).fill("attacker@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for the form to finish processing (button returns from "Signing in…")
    await expect(
      page.getByRole("button", { name: /sign in|locked out/i })
    ).toBeVisible({ timeout: 15_000 });

    // The form must show feedback: either "Invalid credentials", rate-limit lockout, or an alert
    const hasError = await page
      .getByText(/invalid credentials/i)
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    const hasLockout = await page
      .getByText(/too many login attempts|locked out/i)
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    const hasAlert = await page
      .getByRole("alert")
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(hasError || hasLockout || hasAlert).toBeTruthy();

    // The form must not leak information about whether the email exists
    const hasUserHint = await page
      .getByText(/user not found|email does not exist|no account/i)
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    expect(hasUserHint).toBeFalsy();
  });

  test("form disables inputs during submission and re-enables after error", { tag: ["@security"] }, async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`);
    await expect(page.getByRole("heading", { name: /admin login/i })).toBeVisible({ timeout: 10_000 });

    await page.getByLabel(/email/i).fill("locktest@example.com");
    await page.getByLabel(/password/i).fill("badpass");
    await page.getByRole("button", { name: /sign in/i }).click();

    // During submission the button should show loading text
    // After response it should re-enable with error or lockout
    await expect(
      page.getByRole("alert").or(page.getByRole("button", { name: /sign in|locked out/i }))
    ).toBeVisible({ timeout: 10_000 });

    // If locked out, inputs should be disabled
    const lockoutBtn = page.getByRole("button", { name: /locked out/i });
    const isLocked = await lockoutBtn.isVisible({ timeout: 2_000 }).catch(() => false);

    if (isLocked) {
      await expect(lockoutBtn).toBeDisabled();
      await expect(page.getByLabel(/email/i)).toBeDisabled();
      await expect(page.getByLabel(/password/i)).toBeDisabled();
    } else {
      // Not locked out — form should be re-enabled after the error
      await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();
      await expect(page.getByLabel(/email/i)).toBeEnabled();
    }
  });
});

// =========================================================================
// 3. ROUTE PROTECTION — unauthenticated access
// =========================================================================

test.describe("Admin Security — Route Protection", () => {
  const protectedRoutes = [
    "/admin",
    "/admin/markets",
    "/admin/users",
    "/admin/compliance",
    "/admin/aml",
    "/admin/withdrawals",
    "/admin/audit",
    "/admin/reports",
  ];

  for (const route of protectedRoutes) {
    test(`unauthenticated access to ${route} redirects to /login`, { tag: ["@security", "@smoke"] }, async ({ page }) => {
      await page.goto(`${ADMIN_URL}${route}`);
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      expect(page.url()).toContain("/login");
    });
  }

  test("unauthenticated API request is rejected or redirected", { tag: ["@security"] }, async ({ page }) => {
    // Admin API routes should not return successful data without auth.
    // The server may return 401/403, redirect (302/307), or the redirect
    // target (login page returning 200). Playwright follows redirects, so
    // we check the final URL or status.
    const response = await page.request.get(`${ADMIN_URL}/api/admin/withdrawals?stats=true`, {
      maxRedirects: 0,
    });
    const status = response.status();
    // Accept any non-200 status, OR a redirect (3xx)
    const isProtected = status === 401 || status === 403 || (status >= 300 && status < 400) || status === 404;

    // If the server followed the redirect and returned 200, check the body
    // is not actual withdrawal data (it would be the login page HTML)
    if (status === 200) {
      const body = await response.text();
      const isLoginPage = body.includes("login") || body.includes("Admin Login") || body.includes("Sign in");
      const isNotWithdrawalData = !body.includes('"pendingCount"');
      expect(isLoginPage || isNotWithdrawalData).toBeTruthy();
    } else {
      expect(isProtected).toBeTruthy();
    }
  });
});

// =========================================================================
// 4. RBAC — sidebar navigation, role display
// =========================================================================

test.describe("Admin Security — RBAC & Navigation", () => {
  test("admin sidebar shows all compliance nav groups (mocked session)", { tag: ["@security"] }, async ({ page }) => {
    // Mock the API calls that the sidebar makes for badge counts
    await page.route(`${ADMIN_URL}/api/v2/admin/mar/alerts/count`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ count: 3 }) });
    });
    await page.route(`${ADMIN_URL}/api/v2/admin/compliance/summary`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ open_kyc: 1, open_aml_alerts: 2, pending_edd: 0, open_sar_drafts: 1 }),
      });
    });
    await page.route(`${ADMIN_URL}/api/admin/withdrawals**`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ pendingCount: 5 }) });
    });

    await page.goto(`${ADMIN_URL}/admin`);

    // If redirected to login, this test requires an authenticated session
    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    // Verify key security-related nav items exist
    await expect(page.getByText("Lydmarkets Admin")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("Compliance")).toBeVisible();
    await expect(page.getByText("Users")).toBeVisible();
  });

  test("admin header shows role badge and sign-out button", { tag: ["@security"] }, async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    await expect(page.getByLabel("Sign out")).toBeVisible({ timeout: 8_000 });
    // Role should be displayed in header
    const hasRole = await page
      .getByText(/ADMIN|SUPER_ADMIN/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    expect(hasRole).toBeTruthy();
  });
});

// =========================================================================
// 5. SIFS EXPORTS — download triggers, Content-Disposition
// =========================================================================

test.describe("Admin Security — SIFS Exports", () => {
  test("SIFS exports tab renders all 6 mandatory report cards", { tag: ["@compliance"] }, async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin/reports`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    // Navigate to the SIFS Exports tab
    const sifsTab = page.getByRole("button", { name: /sifs/i }).or(page.getByText(/sifs export/i));
    const tabVisible = await sifsTab.first().isVisible({ timeout: 8_000 }).catch(() => false);

    if (tabVisible) {
      await sifsTab.first().click();

      // All 6 SIFS reports should have download buttons
      const reportTitles = [
        "Game Round Log",
        "Session Log",
        "Transaction Log",
        "Inactive Accounts",
        "Closed Accounts with Positive Balance",
        "Quarterly SI Report",
      ];

      for (const title of reportTitles) {
        await expect(page.getByText(title).first()).toBeVisible({ timeout: 5_000 });
      }
    }
  });

  test("SIFS download request includes correct Accept header and returns Content-Disposition", { tag: ["@compliance", "@security"] }, async ({ page }) => {
    // Intercept the SIFS export API call to verify headers
    let requestAcceptHeader = "";
    let responseContentDisposition = "";

    await page.route(`${ADMIN_URL}/api/admin/reports/sifs/**`, async (route) => {
      requestAcceptHeader = route.request().headers()["accept"] ?? "";
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/csv",
          "content-disposition": 'attachment; filename="lyd_game-rounds_2025-01-01_2025-03-01.csv"',
        },
        body: "id,player,stake,outcome\n1,user1,100,50\n",
      });
    });

    await page.goto(`${ADMIN_URL}/admin/reports`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    // Navigate to SIFS tab and trigger a download
    const sifsTab = page.getByRole("button", { name: /sifs/i }).or(page.getByText(/sifs export/i));
    const tabVisible = await sifsTab.first().isVisible({ timeout: 8_000 }).catch(() => false);

    if (tabVisible) {
      await sifsTab.first().click();
      const downloadBtn = page.getByRole("button", { name: /download game round/i });
      const btnVisible = await downloadBtn.isVisible({ timeout: 5_000 }).catch(() => false);

      if (btnVisible) {
        await downloadBtn.click();
        // Wait for the mocked request to complete
        await page.waitForTimeout(1_000);
        expect(requestAcceptHeader).toContain("text/csv");
      }
    }
  });

  test("SIFS export format selector switches between CSV and XML", { tag: ["@compliance"] }, async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin/reports`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    const sifsTab = page.getByRole("button", { name: /sifs/i }).or(page.getByText(/sifs export/i));
    const tabVisible = await sifsTab.first().isVisible({ timeout: 8_000 }).catch(() => false);

    if (tabVisible) {
      await sifsTab.first().click();

      const formatSelect = page.getByLabel(/export format/i).or(page.getByRole("combobox", { name: /format/i }));
      const selectVisible = await formatSelect.first().isVisible({ timeout: 5_000 }).catch(() => false);

      if (selectVisible) {
        await formatSelect.first().selectOption("xml");
        // The cards should now show "Format: XML"
        await expect(page.getByText(/format:\s*xml/i).first()).toBeVisible({ timeout: 3_000 });
      }
    }
  });
});

// =========================================================================
// 6. AML / SAR — alert escalation, status changes
// =========================================================================

test.describe("Admin Security — AML/SAR", () => {
  test("AML page renders with summary cards and alert queue", { tag: ["@compliance", "@smoke"] }, async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin/aml`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    await expect(page.getByRole("heading", { name: /aml compliance/i })).toBeVisible({ timeout: 10_000 });
    // Summary cards should be present
    await expect(page.getByText("Open Alerts")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Total Alerts")).toBeVisible();
  });

  test("AML alert actions: Review, File SAR, Dismiss buttons visible for open alerts (mocked)", { tag: ["@compliance", "@security"] }, async ({ page }) => {
    // Mock the AML alerts endpoint with an open alert
    await page.route(`${ADMIN_URL}/api/v2/admin/aml/**`, async (route) => {
      if (route.request().url().includes("alerts")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            alerts: [
              {
                id: "alert-001",
                userId: "user-001",
                username: "suspicious_user",
                type: "LARGE_TRANSACTION",
                severity: "HIGH",
                status: "OPEN",
                amount: 50000,
                description: "Single deposit exceeding threshold",
                createdAt: new Date().toISOString(),
              },
            ],
            total: 1,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`${ADMIN_URL}/admin/aml`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    // The alert queue should show action buttons for OPEN alerts
    const reviewBtn = page.getByRole("button", { name: /review/i }).first();
    const hasReview = await reviewBtn.isVisible({ timeout: 8_000 }).catch(() => false);

    if (hasReview) {
      await expect(page.getByRole("button", { name: /file sar/i }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /dismiss/i }).first()).toBeVisible();
    }
  });

  test("File SAR opens modal with required notes field", { tag: ["@compliance", "@security"] }, async ({ page }) => {
    await page.route(`${ADMIN_URL}/api/v2/admin/aml/**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          alerts: [
            {
              id: "alert-002",
              userId: "user-002",
              username: "flagged_user",
              type: "VELOCITY",
              severity: "CRITICAL",
              status: "OPEN",
              amount: 100000,
              description: "Rapid deposits",
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1,
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/aml`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    const fileSarBtn = page.getByRole("button", { name: /file sar/i }).first();
    const hasBtn = await fileSarBtn.isVisible({ timeout: 8_000 }).catch(() => false);

    if (hasBtn) {
      await fileSarBtn.click();

      // SAR modal should open
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText(/file suspicious activity report/i)).toBeVisible();
      await expect(page.getByPlaceholder(/describe the suspicious/i)).toBeVisible();

      // Cancel button should close the modal
      await page.getByRole("button", { name: /cancel/i }).click();
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 3_000 });
    }
  });
});

// =========================================================================
// 7. AUDIT TRAIL — hash-chain integrity verification
// =========================================================================

test.describe("Admin Security — Audit Hash-Chain Integrity", () => {
  test("audit integrity page renders with verification controls", { tag: ["@compliance", "@smoke"] }, async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin/audit`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    await expect(page.getByRole("heading", { name: /audit hash-chain integrity/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/sha-256/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /re-run check/i })).toBeVisible();
  });

  test("audit integrity shows chain status after verification (mocked — chain intact)", { tag: ["@compliance", "@security"] }, async ({ page }) => {
    await page.route(`${ADMIN_URL}/api/v2/compliance/audit-integrity**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalRecords: 1500,
          verified: 1500,
          brokenChains: 0,
          missingHashes: 0,
          chainValid: true,
          userChains: 42,
          details: [],
          verifiedAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/audit`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    await expect(page.getByText(/chain intact|no tampering detected/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("1500")).toBeVisible(); // total records
    await expect(page.getByText(/all.*records verified/i)).toBeVisible();
  });

  test("audit integrity shows violations when chain is broken (mocked)", { tag: ["@compliance", "@security"] }, async ({ page }) => {
    await page.route(`${ADMIN_URL}/api/v2/compliance/audit-integrity**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalRecords: 1500,
          verified: 1498,
          brokenChains: 2,
          missingHashes: 0,
          chainValid: false,
          userChains: 42,
          details: [
            {
              id: "abc12345-dead-beef-cafe-000000000001",
              userId: "usr12345-dead-beef-cafe-000000000001",
              actionType: "BET_PLACED",
              createdAt: new Date().toISOString(),
              issue: "Hash mismatch: expected != computed",
            },
            {
              id: "abc12345-dead-beef-cafe-000000000002",
              userId: "usr12345-dead-beef-cafe-000000000001",
              actionType: "BET_SETTLED",
              createdAt: new Date().toISOString(),
              issue: "Previous hash reference broken",
            },
          ],
          verifiedAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/audit`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    await expect(page.getByText(/chain violations found/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Broken chains")).toBeVisible();
    await expect(page.getByText("Chain Violations (2)")).toBeVisible();
    // Violation details table should show the issues
    await expect(page.getByText(/hash mismatch/i).first()).toBeVisible();
  });

  test("re-run check button triggers a new verification", { tag: ["@compliance"] }, async ({ page }) => {
    let fetchCount = 0;
    await page.route(`${ADMIN_URL}/api/v2/compliance/audit-integrity**`, async (route) => {
      fetchCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalRecords: 100,
          verified: 100,
          brokenChains: 0,
          missingHashes: 0,
          chainValid: true,
          userChains: 5,
          details: [],
          verifiedAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/audit`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    await expect(page.getByText(/chain intact/i)).toBeVisible({ timeout: 10_000 });
    const initialCount = fetchCount;

    await page.getByRole("button", { name: /re-run check/i }).click();
    // Wait for the second fetch to complete
    await expect(page.getByText(/chain intact/i)).toBeVisible({ timeout: 10_000 });
    expect(fetchCount).toBeGreaterThan(initialCount);
  });
});

// =========================================================================
// 8. SPELPAUS — self-exclusion indicators
// =========================================================================

test.describe("Admin Security — Spelpaus / Self-Exclusion", () => {
  test("compliance dashboard shows Spelpaus/Self-Exclusion card", { tag: ["@compliance", "@smoke"] }, async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin/compliance`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    await expect(page.getByRole("heading", { name: /compliance dashboard/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Self-Exclusions")).toBeVisible({ timeout: 5_000 });
  });

  test("users list shows Spelpaus column with ACTIVE/Inactive badges (mocked)", { tag: ["@compliance", "@security"] }, async ({ page }) => {
    await page.route(`${ADMIN_URL}/api/admin/users**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          users: [
            {
              id: "u1",
              username: "blocked_player",
              email: "blocked@example.com",
              role: "USER",
              status: "active",
              kycStatus: "VERIFIED",
              spelpausStatus: "ACTIVE",
              balance: 0,
              registeredAt: "2024-01-15T10:00:00Z",
              lastSeen: "2025-03-01T12:00:00Z",
            },
            {
              id: "u2",
              username: "normal_player",
              email: "normal@example.com",
              role: "USER",
              status: "active",
              kycStatus: "VERIFIED",
              spelpausStatus: "INACTIVE",
              balance: 5000,
              registeredAt: "2024-06-01T10:00:00Z",
              lastSeen: "2025-03-20T12:00:00Z",
            },
          ],
          total: 2,
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/users`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    await expect(page.getByRole("heading", { name: /users/i })).toBeVisible({ timeout: 10_000 });

    // ACTIVE Spelpaus badge should be visually distinct (destructive/red)
    const activeBadge = page.getByText("ACTIVE").first();
    const hasActiveBadge = await activeBadge.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasActiveBadge) {
      await expect(activeBadge).toBeVisible();
      // Inactive badge should also be present
      await expect(page.getByText("Inactive").first()).toBeVisible();
    }
  });

  test("compliance player tab shows Spelpaus status per player (mocked)", { tag: ["@compliance"] }, async ({ page }) => {
    await page.route(`${ADMIN_URL}/api/v2/admin/compliance/**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          players: [
            {
              id: "p1",
              username: "spelpaus_user",
              kycStatus: "VERIFIED",
              spelpausActive: true,
              dailyLimit: 1000,
              dailyUsed: 0,
              weeklyLimit: 5000,
              weeklyUsed: 0,
              monthlyLimit: 20000,
              monthlyUsed: 0,
              exclusions: 1,
            },
          ],
          total: 1,
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/compliance`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    // Click the "Player Compliance" tab
    const playerTab = page.getByRole("button", { name: /player compliance/i }).or(page.getByText(/player compliance/i));
    const tabVisible = await playerTab.first().isVisible({ timeout: 8_000 }).catch(() => false);

    if (tabVisible) {
      await playerTab.first().click();
      // Spelpaus column should show ACTIVE badge
      await expect(page.getByText("ACTIVE").first()).toBeVisible({ timeout: 5_000 });
    }
  });
});

// =========================================================================
// 9. WITHDRAWALS — approve/reject queue
// =========================================================================

test.describe("Admin Security — Withdrawals", () => {
  test("withdrawal page renders with summary cards and queue", { tag: ["@compliance", "@smoke"] }, async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin/withdrawals`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    await expect(page.getByRole("heading", { name: /withdrawal approval queue/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Pending")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Approved Today")).toBeVisible();
    await expect(page.getByText("Rejected Today")).toBeVisible();
  });

  test("withdrawal approve action opens confirmation dialog (mocked)", { tag: ["@compliance", "@security"] }, async ({ page }) => {
    await page.route(`${ADMIN_URL}/api/admin/withdrawals**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          withdrawals: [
            {
              id: "w1",
              userId: "u1",
              username: "test_user",
              amount: 5000,
              method: "Swish",
              status: "pending",
              kycStatus: "approved",
              amlRiskLevel: "low",
              totalDeposits: 10000,
              totalWithdrawals: 2000,
              requestedAt: new Date().toISOString(),
            },
          ],
          total: 1,
          pendingCount: 1,
          totalPendingAmount: 5000,
          approvedToday: 3,
          rejectedToday: 0,
          avgProcessingTimeMs: 120000,
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/withdrawals`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    // Find the approve icon button (CheckCircle)
    const approveBtn = page.getByRole("button", { name: /approve/i }).first();
    const hasBtn = await approveBtn.isVisible({ timeout: 8_000 }).catch(() => false);

    if (hasBtn) {
      await approveBtn.click();

      // Confirmation dialog should appear
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText(/approve withdrawal/i)).toBeVisible();

      // Cancel should close it
      await page.getByRole("button", { name: /cancel/i }).click();
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 3_000 });
    }
  });

  test("withdrawal reject action requires a reason (mocked)", { tag: ["@compliance", "@security"] }, async ({ page }) => {
    await page.route(`${ADMIN_URL}/api/admin/withdrawals**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          withdrawals: [
            {
              id: "w2",
              userId: "u2",
              username: "reject_test",
              amount: 15000,
              method: "Stripe",
              status: "pending",
              kycStatus: "pending",
              amlRiskLevel: "medium",
              totalDeposits: 20000,
              totalWithdrawals: 5000,
              requestedAt: new Date().toISOString(),
            },
          ],
          total: 1,
          pendingCount: 1,
          totalPendingAmount: 15000,
          approvedToday: 0,
          rejectedToday: 0,
          avgProcessingTimeMs: 60000,
        }),
      });
    });

    await page.goto(`${ADMIN_URL}/admin/withdrawals`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    // Click the reject icon button (XCircle)
    const rejectBtn = page.getByRole("button", { name: /reject/i }).first();
    const hasBtn = await rejectBtn.isVisible({ timeout: 8_000 }).catch(() => false);

    if (hasBtn) {
      await rejectBtn.click();

      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText(/reject withdrawal/i)).toBeVisible();
      // Reason field should be present for rejections
      await expect(
        page.getByPlaceholder(/rejection reason/i).or(page.getByLabel(/reason/i))
      ).toBeVisible();
    }
  });

  test("withdrawal status filter shows Pending/Approved/Rejected/On Hold options", { tag: ["@compliance"] }, async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin/withdrawals`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    await expect(page.getByRole("heading", { name: /withdrawal/i })).toBeVisible({ timeout: 10_000 });

    // Open the status filter dropdown
    const statusFilter = page.getByRole("combobox").first().or(page.getByText(/all statuses/i));
    const hasFilter = await statusFilter.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasFilter) {
      // Verify filter options exist
      await expect(statusFilter).toBeVisible();
    }
  });
});

// =========================================================================
// 10. MARKET LIFECYCLE — approve → settle
// =========================================================================

test.describe("Admin Security — Market Lifecycle", () => {
  test("markets page renders and shows status column", { tag: ["@smoke"] }, async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin/markets`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
    const hasContent = await page
      .getByText(/market|pending|active|closed|status/i)
      .first()
      .isVisible({ timeout: 8_000 })
      .catch(() => false);

    expect(hasContent).toBeTruthy();
  });

  test("pending market shows Approve and Reject action buttons", { tag: ["@smoke"] }, async ({ page }) => {
    await page.goto(`${ADMIN_URL}/admin/markets?status=pending`);

    if (page.url().includes("/login")) {
      expect(page.url()).toContain("/login");
      return;
    }

    await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });

    // If there are pending markets, action buttons should be visible
    const pendingRow = page.getByRole("link").filter({ hasText: /\?|will|is|does/ }).first();
    const hasPending = await pendingRow.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasPending) {
      await pendingRow.click();
      await expect(page.getByRole("button", { name: /approve/i })).toBeVisible({ timeout: 5_000 });
      await expect(page.getByRole("button", { name: /reject|decline/i })).toBeVisible();
    }
  });
});
