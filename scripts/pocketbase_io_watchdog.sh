#!/usr/bin/env bash
# Watchdog: при disk I/O error в логах PocketBase — restart + алерт в MAX.
# Cron: каждые 5 минут.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/tennis}"
BACKUP_DIR="${BACKUP_DIR:-/opt/tennis/backups}"
PB_SERVICE="${PB_SERVICE:-pocketbase}"
STATE_DIR="$BACKUP_DIR/state"
LAST_RESTART_FILE="$STATE_DIR/pb_watchdog_last_restart"
MIN_RESTART_INTERVAL_SEC="${WATCHDOG_MIN_INTERVAL_SEC:-900}"
LOOKBACK="${WATCHDOG_LOOKBACK:-6 min ago}"
ALERT_SCRIPT="${ALERT_SCRIPT:-$APP_DIR/scripts/ops_alert_max.sh}"

mkdir -p "$STATE_DIR"

if ! journalctl -u "$PB_SERVICE" --since "$LOOKBACK" --no-pager 2>/dev/null \
  | grep -Eiq 'disk I/O error|I/O error \(522\)'; then
  exit 0
fi

now=$(date +%s)
if [[ -f "$LAST_RESTART_FILE" ]]; then
  last=$(cat "$LAST_RESTART_FILE" 2>/dev/null || echo 0)
  if [[ "$last" =~ ^[0-9]+$ ]] && (( now - last < MIN_RESTART_INTERVAL_SEC )); then
    echo "[watchdog] I/O seen but rate-limited (last restart ${last})"
    exit 0
  fi
fi

echo "[watchdog] disk I/O detected — restarting $PB_SERVICE"
systemctl restart "$PB_SERVICE"
echo "$now" >"$LAST_RESTART_FILE"

host=$(hostname -f 2>/dev/null || hostname)
msg="⚠️ *PocketBase watchdog*
Хост: \`${host}\`
Обнаружен \`disk I/O error\` в journal за последние минуты.
Выполнен \`systemctl restart ${PB_SERVICE}\`.
Время: $(date -Is)"

if [[ -x "$ALERT_SCRIPT" ]]; then
  "$ALERT_SCRIPT" "$msg" || echo "[watchdog] alert send failed" >&2
else
  echo "[watchdog] alert script missing: $ALERT_SCRIPT" >&2
fi

echo "[watchdog] done"
