#!/usr/bin/env bash
# scripts/run-e2e.sh — parameterized E2E runner + Discord reporter.
#
# Used by the GitHub Actions post-merge workflow. The nightly cron
# (scripts/nightly-e2e.sh) continues to run independently on the old VPS.
#
# Required env:
#   BASE_URL            — target URL (e.g. https://web-staging-71a7.up.railway.app)
#   DISCORD_WEBHOOK_URL — Discord webhook to post results to
#
# Optional env:
#   E2E_TEST_SECRET — shared secret for auth.setup login fixture
#   RUN_CONTEXT     — label used in the embed title (default "E2E")
#   PR_NUMBER       — shown as a Discord field if set
#   PR_TITLE        — shown alongside PR_NUMBER if set
#   PR_URL          — makes PR_NUMBER a clickable link if set

set -euo pipefail

BASE_URL="${BASE_URL:?BASE_URL is required}"
DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:?DISCORD_WEBHOOK_URL is required}"
RUN_CONTEXT="${RUN_CONTEXT:-E2E}"

RESULTS_DIR="$(pwd)/results"
REPORT_FILE="$RESULTS_DIR/report.json"
mkdir -p "$RESULTS_DIR"

# ── Run Playwright ────────────────────────────────────────────────────────────

START_TIME=$(date +%s)
set +e
BASE_URL="$BASE_URL" \
E2E_TEST_SECRET="${E2E_TEST_SECRET:-}" \
  bun run test:e2e 2>&1
EXIT_CODE=$?
set -e

DURATION=$(( $(date +%s) - START_TIME ))
DURATION_HUMAN=$(printf '%dm %ds' $((DURATION / 60)) $((DURATION % 60)))

# ── Parse results ─────────────────────────────────────────────────────────────

if [[ -f "$REPORT_FILE" ]]; then
  PASSED=$(jq  '.stats.expected'   "$REPORT_FILE")
  FAILED=$(jq  '.stats.unexpected' "$REPORT_FILE")
  FLAKY=$(jq   '.stats.flaky'      "$REPORT_FILE")
  SKIPPED=$(jq '.stats.skipped'    "$REPORT_FILE")
  TOTAL=$(( PASSED + FAILED + FLAKY + SKIPPED ))
else
  TOTAL=0 PASSED=0 FAILED=0 FLAKY=0 SKIPPED=0
fi

# ── Build Discord embed ───────────────────────────────────────────────────────

if [[ "$EXIT_CODE" -eq 0 ]]; then
  COLOR=3066993    # green
  STATUS=":white_check_mark: ALL PASSED"
else
  COLOR=15158332   # red
  STATUS=":x: FAILURES DETECTED"
fi

# Collect names of failing tests. Use recursive descent to handle Playwright's
# nested-suite JSON structure (.suites[].suites[].specs[]...).
FAILED_LIST=""
if [[ -f "$REPORT_FILE" && "$FAILED" -gt 0 ]]; then
  FAILED_LIST=$(jq -r '
    [.. | objects | select(has("specs")) | .specs[]?
     | select(.ok == false) | "• " + .title]
    | unique | join("\n")
  ' "$REPORT_FILE" 2>/dev/null | head -c 900)
fi

FIELDS=$(jq -n \
  --argjson passed  "$PASSED"         \
  --argjson failed  "$FAILED"         \
  --argjson flaky   "$FLAKY"          \
  --argjson skipped "$SKIPPED"        \
  --arg     dur     "$DURATION_HUMAN" \
  --arg     target  "$BASE_URL"       \
  '[
    { name: "Passed",   value: ($passed  | tostring), inline: true },
    { name: "Failed",   value: ($failed  | tostring), inline: true },
    { name: "Flaky",    value: ($flaky   | tostring), inline: true },
    { name: "Skipped",  value: ($skipped | tostring), inline: true },
    { name: "Duration", value: $dur,                  inline: true },
    { name: "Target",   value: $target,               inline: true }
  ]')

if [[ -n "${PR_NUMBER:-}" ]]; then
  PR_LABEL="#${PR_NUMBER}"
  if [[ -n "${PR_URL:-}" ]]; then
    PR_LABEL="[#${PR_NUMBER}](${PR_URL})"
  fi
  FIELDS=$(echo "$FIELDS" | jq \
    --arg label "$PR_LABEL ${PR_TITLE:-}" \
    '. + [{ name: "PR", value: $label, inline: false }]')
fi

if [[ -n "$FAILED_LIST" ]]; then
  FIELDS=$(echo "$FIELDS" | jq \
    --arg fl "$FAILED_LIST" \
    '. + [{ name: "Failed Tests", value: ("```\n" + $fl + "\n```"), inline: false }]')
fi

PAYLOAD=$(jq -n \
  --arg     title  "${RUN_CONTEXT} E2E — ${STATUS}"              \
  --arg     desc   "${TOTAL} tests | $(date +'%Y-%m-%d %H:%M %Z')" \
  --argjson color  "$COLOR"                                       \
  --argjson fields "$FIELDS"                                      \
  '{ embeds: [{ title: $title, description: $desc, color: $color, fields: $fields, footer: { text: "lydmarkets-qa" } }] }')

curl -sS -H "Content-Type: application/json" -d "$PAYLOAD" "$DISCORD_WEBHOOK_URL" > /dev/null
echo "Discord notification sent (exit code: $EXIT_CODE)"
exit "$EXIT_CODE"
