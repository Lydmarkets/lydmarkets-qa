#!/usr/bin/env bash
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────
PROJECT_DIR="/opt/lydmarkets-qa"
DISCORD_WEBHOOK="https://discordapp.com/api/webhooks/1486391192517087403/bNr9mIfzS_hJkzN0NofmRcYSvEHkON58m5mLyvsJG8Chd1Y-lhuVupR3jj8HrgYcKnWQ"
BASE_URL="${BASE_URL:-https://web-production-bb35.up.railway.app}"
K6="$(command -v k6)"
LOG_FILE="$PROJECT_DIR/results/nightly-load-$(date +%F).log"

# ── Ensure repo is up to date ──────────────────────────────────────
cd "$PROJECT_DIR"
mkdir -p results
git pull --ff-only origin main 2>/dev/null || true

# ── Run load test (market browse — the only scenario that works
#    without direct backend service URLs) ────────────────────────────
START_TIME=$(date +%s)
DATE_STR=$(date +"%Y-%m-%d %H:%M %Z")

set +e
"$K6" run \
  --env BASE_URL="$BASE_URL" \
  --summary-trend-stats="avg,min,med,max,p(90),p(95),p(99)" \
  tests/load/market-browse.js 2>&1 | tee "$LOG_FILE"
K6_EXIT=${PIPESTATUS[0]}
set -e

END_TIME=$(date +%s)
DURATION=$(( END_TIME - START_TIME ))
MINUTES=$(( DURATION / 60 ))
SECONDS_REM=$(( DURATION % 60 ))

# ── Parse k6 JSON output ───────────────────────────────────────────
# Find latest results file
RESULT_FILE=$(ls -t "$PROJECT_DIR"/results/load-market-browse-*.json 2>/dev/null | head -1)

if [[ -n "$RESULT_FILE" && -f "$RESULT_FILE" ]]; then
  LIST_P95=$(jq -r '.metrics.market_list_duration.values["p(95)"] // 0 | round' "$RESULT_FILE")
  DETAIL_P95=$(jq -r '.metrics.market_detail_duration.values["p(95)"] // 0 | round' "$RESULT_FILE")
  OVERALL_P95=$(jq -r '.metrics.http_req_duration.values["p(95)"] // 0 | round' "$RESULT_FILE")
  OVERALL_P99=$(jq -r '.metrics.http_req_duration.values["p(99)"] // 0 | round' "$RESULT_FILE")
  OVERALL_AVG=$(jq -r '.metrics.http_req_duration.values.avg // 0 | round' "$RESULT_FILE")
  ERROR_RATE=$(jq -r '.metrics.http_req_failed.values.rate // 0' "$RESULT_FILE")
  ERROR_PCT=$(echo "$ERROR_RATE" | awk '{printf "%.2f", $1 * 100}')
  ITERATIONS=$(jq -r '.metrics.iterations.values.count // 0' "$RESULT_FILE")
  MAX_VUS=$(jq -r '.metrics.vus_max.values.max // 0' "$RESULT_FILE")
  RPS=$(jq -r '.metrics.http_reqs.values.rate // 0 | round' "$RESULT_FILE")

  # Check thresholds
  P95_OK=$(jq -r '.metrics.http_req_duration.thresholds["p(95)<5500"].ok // false' "$RESULT_FILE")
  ERRORS_OK=$(jq -r '.metrics.http_req_failed.thresholds["rate<0.01"].ok // false' "$RESULT_FILE")
else
  LIST_P95="?"
  DETAIL_P95="?"
  OVERALL_P95="?"
  OVERALL_P99="?"
  OVERALL_AVG="?"
  ERROR_PCT="?"
  ITERATIONS="?"
  MAX_VUS="?"
  RPS="?"
  P95_OK="false"
  ERRORS_OK="false"
fi

# ── Build Discord embed ─────────────────────────────────────────────
if [[ "$K6_EXIT" -eq 0 ]]; then
  COLOR=3066993  # green
  STATUS_EMOJI=":white_check_mark:"
  STATUS_TEXT="THRESHOLDS MET"
elif [[ "$K6_EXIT" -eq 99 ]]; then
  COLOR=16744448 # orange — thresholds crossed but test ran
  STATUS_EMOJI=":warning:"
  STATUS_TEXT="THRESHOLDS CROSSED"
else
  COLOR=15158332 # red — test errored
  STATUS_EMOJI=":x:"
  STATUS_TEXT="TEST FAILED"
fi

FIELDS=$(jq -n \
  --arg list_p95 "${LIST_P95} ms" \
  --arg detail_p95 "${DETAIL_P95} ms" \
  --arg overall_p95 "${OVERALL_P95} ms" \
  --arg overall_p99 "${OVERALL_P99} ms" \
  --arg avg "${OVERALL_AVG} ms" \
  --arg errors "${ERROR_PCT}%" \
  --arg iters "$ITERATIONS" \
  --arg vus "$MAX_VUS" \
  --arg rps "${RPS} req/s" \
  --arg duration "${MINUTES}m ${SECONDS_REM}s" \
  --arg target "$BASE_URL" \
  '[
    { "name": "List Page p95",   "value": $list_p95,   "inline": true },
    { "name": "Detail Page p95", "value": $detail_p95, "inline": true },
    { "name": "Overall p95",     "value": $overall_p95,"inline": true },
    { "name": "Overall p99",     "value": $overall_p99,"inline": true },
    { "name": "Avg Latency",     "value": $avg,        "inline": true },
    { "name": "Error Rate",      "value": $errors,     "inline": true },
    { "name": "Iterations",      "value": $iters,      "inline": true },
    { "name": "Peak VUs",        "value": $vus,        "inline": true },
    { "name": "Throughput",      "value": $rps,        "inline": true },
    { "name": "Duration",        "value": $duration,   "inline": true },
    { "name": "Target",          "value": $target,     "inline": true }
  ]')

PAYLOAD=$(jq -n \
  --arg status "$STATUS_EMOJI $STATUS_TEXT" \
  --arg date "$DATE_STR" \
  --arg iters "$ITERATIONS" \
  --arg vus "$MAX_VUS" \
  --argjson color "$COLOR" \
  --argjson fields "$FIELDS" \
  '{
    "embeds": [{
      "title": ("Nightly Load Test — " + $status),
      "description": ($iters + " iterations | " + $vus + " peak VUs | " + $date),
      "color": $color,
      "fields": $fields,
      "footer": { "text": "lydmarkets-qa / k6 market-browse" }
    }]
  }')

# ── Send to Discord ─────────────────────────────────────────────────
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$DISCORD_WEBHOOK")

echo ""
echo "Discord notification sent (HTTP $HTTP_CODE). k6 exit: $K6_EXIT"

# Clean up old result files (keep last 30 days)
find "$PROJECT_DIR/results" -name "load-market-browse-*.json" -mtime +30 -delete 2>/dev/null || true
find "$PROJECT_DIR/results" -name "nightly-load-*.log" -mtime +30 -delete 2>/dev/null || true

exit "$K6_EXIT"
