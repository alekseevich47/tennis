#!/usr/bin/env bash
# Отправка ops-алерта в MAX ботом (мимо PocketBase).
# Usage: ops_alert_max.sh "message text"
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/tennis}"
RECIPIENTS_FILE="${OPS_ALERT_RECIPIENTS_FILE:-$APP_DIR/config/ops_alert_recipients.env}"
OPS_ALERT_ENV="${OPS_ALERT_ENV:-/etc/tennis/ops_alert.env}"

TEXT="${1:-}"
if [[ -z "$TEXT" ]]; then
  echo "Usage: $0 \"message\"" >&2
  exit 1
fi

if [[ -f "$OPS_ALERT_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a
  # shellcheck source=/dev/null
  source "$OPS_ALERT_ENV"
  set +a
fi

if [[ -z "${MAX_BOT_TOKEN:-}" ]]; then
  envline=$(systemctl show pocketbase -p Environment --value 2>/dev/null || true)
  if [[ "$envline" =~ MAX_BOT_TOKEN=([^[:space:]]+) ]]; then
    MAX_BOT_TOKEN="${BASH_REMATCH[1]}"
  fi
fi

if [[ -z "${MAX_BOT_TOKEN:-}" ]]; then
  echo "[ops-alert] MAX_BOT_TOKEN not set (check $OPS_ALERT_ENV or pocketbase Environment)" >&2
  exit 1
fi

if [[ -f "$RECIPIENTS_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  # shellcheck source=/dev/null
  source "$RECIPIENTS_FILE"
  set +a
fi

IDS_RAW="${OPS_ALERT_MAX_IDS:-}"
if [[ -z "$IDS_RAW" ]]; then
  echo "[ops-alert] OPS_ALERT_MAX_IDS empty in $RECIPIENTS_FILE" >&2
  exit 1
fi

IFS=',' read -r -a IDS <<<"$IDS_RAW"
ok=0
for raw in "${IDS[@]}"; do
  id=$(echo "$raw" | tr -d '[:space:]')
  [[ -n "$id" ]] || continue
  if ! [[ "$id" =~ ^[0-9]+$ ]]; then
    echo "[ops-alert] skip invalid id: $id" >&2
    continue
  fi
  body=$(python3 -c 'import json,sys; print(json.dumps({"text": sys.argv[1], "format": "markdown"}))' "$TEXT")
  code=$(curl -sS -o /tmp/ops_alert_max_body.$$ -w "%{http_code}" \
    -X POST "https://botapi.max.ru/messages?user_id=${id}" \
    -H "Content-Type: application/json" \
    -H "Authorization: ${MAX_BOT_TOKEN}" \
    -d "$body" \
    || echo "000")
  if [[ "$code" =~ ^2 ]]; then
    ok=$((ok + 1))
  else
    echo "[ops-alert] MAX API user_id=$id HTTP $code: $(cat /tmp/ops_alert_max_body.$$ 2>/dev/null || true)" >&2
  fi
  rm -f /tmp/ops_alert_max_body.$$
done

if [[ "$ok" -eq 0 ]]; then
  echo "[ops-alert] no messages delivered" >&2
  exit 1
fi
echo "[ops-alert] delivered to $ok recipient(s)"
