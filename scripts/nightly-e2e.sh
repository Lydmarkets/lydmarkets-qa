#!/usr/bin/env bash
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────
PROJECT_DIR="/opt/lydmarkets-qa"
DISCORD_WEBHOOK="https://discordapp.com/api/webhooks/1486391192517087403/bNr9mIfzS_hJkzN0NofmRcYSvEHkON58m5mLyvsJG8Chd1Y-lhuVupR3jj8HrgYcKnWQ"
BASE_URL="${BASE_URL:-https://web-staging-71a7.up.railway.app}"
LOG_FILE="$PROJECT_DIR/results/nightly-$(date +%F).log"

# ── Ensure deps ─────────────────────────────────────────────────────
export PATH="$HOME/.bun/bin:$PATH"
cd "$PROJECT_DIR"
mkdir -p results
git pull --ff-only origin main 2>/dev/null || true
bun install --frozen-lockfile 2>/dev/null || true

# ── Run tests ───────────────────────────────────────────────────────
START_TIME=$(date +%s)
set +e
BASE_URL="$BASE_URL" bun run test:e2e 2>&1 | tee "$LOG_FILE"
EXIT_CODE=${PIPESTATUS[0]}
set -e
END_TIME=$(date +%s)
DURATION=$(( END_TIME - START_TIME ))
MINUTES=$(( DURATION / 60 ))
SECONDS_REM=$(( DURATION % 60 ))

# ── Parse results from JSON report ──────────────────────────────────
REPORT_FILE="$PROJECT_DIR/results/report.json"

if [[ -f "$REPORT_FILE" ]]; then
  TOTAL=$(jq '.stats.expected + .stats.unexpected + .stats.flaky + .stats.skipped' "$REPORT_FILE")
  PASSED=$(jq '.stats.expected' "$REPORT_FILE")
  FAILED=$(jq '.stats.unexpected' "$REPORT_FILE")
  FLAKY=$(jq '.stats.flaky' "$REPORT_FILE")
  SKIPPED=$(jq '.stats.skipped' "$REPORT_FILE")
else
  TOTAL="?"
  PASSED="?"
  FAILED="?"
  FLAKY="?"
  SKIPPED="?"
fi

# ── Build Discord embed ─────────────────────────────────────────────
DATE_STR=$(date +"%Y-%m-%d %H:%M %Z")

if [[ "$EXIT_CODE" -eq 0 ]]; then
  COLOR=3066993  # green
  STATUS_EMOJI=":white_check_mark:"
  STATUS_TEXT="ALL PASSED"
else
  COLOR=15158332 # red
  STATUS_EMOJI=":x:"
  STATUS_TEXT="FAILURES DETECTED"
fi

# Collect failed test names if any
FAILED_LIST=""
if [[ -f "$REPORT_FILE" && "$FAILED" != "?" && "$FAILED" -gt 0 ]]; then
  FAILED_LIST=$(jq -r '
    [.suites[].suites[]?.specs[]? // .suites[].specs[]?
     | select(.ok == false)
     | "• " + .title] | join("\n")
  ' "$REPORT_FILE" 2>/dev/null | head -c 900)

  if [[ -z "$FAILED_LIST" ]]; then
    # fallback: try flat structure
    FAILED_LIST=$(jq -r '
      [.suites[].specs[]
       | select(.ok == false)
       | "• " + .title] | join("\n")
    ' "$REPORT_FILE" 2>/dev/null | head -c 900)
  fi
fi

# Build fields JSON
FIELDS=$(jq -n \
  --arg passed "$PASSED" \
  --arg failed "$FAILED" \
  --arg flaky "$FLAKY" \
  --arg skipped "$SKIPPED" \
  --arg duration "${MINUTES}m ${SECONDS_REM}s" \
  --arg target "$BASE_URL" \
  '[
    { "name": "Passed",   "value": $passed,   "inline": true },
    { "name": "Failed",   "value": $failed,   "inline": true },
    { "name": "Flaky",    "value": $flaky,    "inline": true },
    { "name": "Skipped",  "value": $skipped,  "inline": true },
    { "name": "Duration", "value": $duration, "inline": true },
    { "name": "Target",   "value": $target,   "inline": true }
  ]')

# Add failed test list as a field if present
if [[ -n "$FAILED_LIST" ]]; then
  FIELDS=$(echo "$FIELDS" | jq \
    --arg fl "$FAILED_LIST" \
    '. + [{ "name": "Failed Tests", "value": ("```\n" + $fl + "\n```"), "inline": false }]')
fi

PAYLOAD=$(jq -n \
  --arg status "$STATUS_EMOJI $STATUS_TEXT" \
  --arg date "$DATE_STR" \
  --arg total "$TOTAL" \
  --argjson color "$COLOR" \
  --argjson fields "$FIELDS" \
  '{
    "embeds": [{
      "title": ("Nightly E2E — " + $status),
      "description": ($total + " tests | " + $date),
      "color": $color,
      "fields": $fields,
      "footer": { "text": "lydmarkets-qa" }
    }]
  }')

# ── Send to Discord ─────────────────────────────────────────────────
curl -s -o /dev/null -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$DISCORD_WEBHOOK"

echo ""
echo "Discord notification sent. Exit code: $EXIT_CODE"
exit "$EXIT_CODE"
