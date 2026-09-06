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

echo "[admin_backup_runner] start type=$TYPE script=$SCRIPT"

set +e
sudo -n "$SCRIPT" --force
code=$?
set -e

echo "[admin_backup_runner] backup exit=$code"

ok_json=false
if [[ "$code" -eq 0 ]]; then
  ok_json=true
fi

payload=$(printf '{"type":"%s","ok":%s,"code":%s}' "$TYPE" "$ok_json" "$code")

if [[ -z "$NOTIFY_TOKEN" ]]; then
  echo "[admin_backup_runner] WARN: BACKUP_NOTIFY_TOKEN empty — skip notify" >&2
  exit "$code"
fi

http_code=$(curl -sS -m 15 -o /tmp/tennis-backup-notify-body.$$ -w '%{http_code}' -X POST "$NOTIFY_URL" \
  -H 'Content-Type: application/json' \
  -H "X-Backup-Notify-Token: $NOTIFY_TOKEN" \
  -d "$payload" || true)

echo "[admin_backup_runner] notify HTTP $http_code body=$(cat /tmp/tennis-backup-notify-body.$$ 2>/dev/null || true)"
rm -f /tmp/tennis-backup-notify-body.$$

if [[ "$http_code" != "200" ]]; then
  echo "[admin_backup_runner] notify failed (backup exit=$code)" >&2
fi

exit "$code"
