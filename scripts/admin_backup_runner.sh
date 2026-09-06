#!/usr/bin/env bash
# Обёртка ручного бэкапа из админки: sudo-скрипт → POST результата в PB (колокольчик модераторам).
# Вызов (от пользователя pocketbase): bash admin_backup_runner.sh <db|media> [notify_url]
set -uo pipefail

TYPE="${1:-}"
NOTIFY_URL="${2:-${BACKUP_NOTIFY_URL:-http://127.0.0.1:8090/api/internal/backup-notify}}"
NOTIFY_TOKEN="${BACKUP_NOTIFY_TOKEN:-}"

APP_DIR="${APP_DIR:-/opt/tennis}"
SCRIPTS="${APP_DIR}/scripts"

case "$TYPE" in
  db)
    SCRIPT="$SCRIPTS/backup_db_to_yandex.sh"
    ;;
  media)
    SCRIPT="$SCRIPTS/backup_storage_to_yandex.sh"
    ;;
  *)
    echo "usage: $0 db|media [notify_url]" >&2
    exit 2
    ;;
esac

set +e
sudo -n "$SCRIPT" --force
code=$?
set -e

ok_json=false
if [[ "$code" -eq 0 ]]; then
  ok_json=true
fi

payload=$(printf '{"type":"%s","ok":%s,"code":%s}' "$TYPE" "$ok_json" "$code")

curl_args=(-sS -m 15 -X POST "$NOTIFY_URL"
  -H 'Content-Type: application/json'
  -d "$payload")
if [[ -n "$NOTIFY_TOKEN" ]]; then
  curl_args+=(-H "X-Backup-Notify-Token: $NOTIFY_TOKEN")
fi

if ! curl "${curl_args[@]}"; then
  echo "[admin_backup_runner] notify HTTP failed (backup exit=$code)" >&2
fi

exit "$code"
