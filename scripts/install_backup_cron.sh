#!/usr/bin/env bash
# Установка crontab для трёхслойных бэкапов, watchdog и sudoers для кнопок админки.
# Запуск: sudo /opt/tennis/scripts/install_backup_cron.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/tennis}"
SCRIPTS="$APP_DIR/scripts"
BACKUP_DIR="${BACKUP_DIR:-/opt/tennis/backups}"
PB_USER="${PB_USER:-pocketbase}"

mkdir -p "$BACKUP_DIR/state" "$BACKUP_DIR/locks" /etc/tennis
chmod +x "$SCRIPTS"/backup_*.sh "$SCRIPTS"/restore_*.sh "$SCRIPTS"/install_backup_cron.sh \
  "$SCRIPTS"/pocketbase_io_watchdog.sh "$SCRIPTS"/ops_alert_max.sh \
  "$SCRIPTS"/admin_backup_runner.sh 2>/dev/null || true
chmod +x "$SCRIPTS/backup_common.sh" 2>/dev/null || true

# DB offset +3 min from membership_lifecycle */15; MEDIA 00:00 MSK; full Sun 00:00 MSK
CRON_MARKER="# tennis-backup-v2"
CRON_BLOCK=$(cat <<EOF
$CRON_MARKER
3,18,33,48 * * * * $SCRIPTS/backup_db_to_yandex.sh >>/var/log/tennis-backup-db.log 2>&1
0 21 * * * $SCRIPTS/backup_storage_to_yandex.sh >>/var/log/tennis-backup-media.log 2>&1
0 21 * * 0 $SCRIPTS/backup_to_yandex.sh >>/var/log/tennis-backup-full.log 2>&1
*/5 * * * * $SCRIPTS/pocketbase_io_watchdog.sh >>/var/log/tennis-pb-watchdog.log 2>&1
EOF
)

EXISTING=$(crontab -l 2>/dev/null || true)
FILTERED=$(echo "$EXISTING" \
  | grep -vF "# tennis-backup-v1" \
  | grep -vF "$CRON_MARKER" \
  | grep -vF "$SCRIPTS/backup_db_to_yandex.sh" \
  | grep -vF "$SCRIPTS/backup_storage_to_yandex.sh" \
  | grep -vF "$SCRIPTS/backup_to_yandex.sh" \
  | grep -vF "$SCRIPTS/pocketbase_io_watchdog.sh" \
  || true)
printf '%s\n%s\n' "$FILTERED" "$CRON_BLOCK" | crontab -

SUDOERS_FILE="/etc/sudoers.d/tennis-backup"
cat >"$SUDOERS_FILE" <<EOF
# Allow PocketBase service user to trigger backup scripts from admin UI
$PB_USER ALL=(root) NOPASSWD: $SCRIPTS/backup_db_to_yandex.sh, $SCRIPTS/backup_storage_to_yandex.sh
EOF
chmod 440 "$SUDOERS_FILE"
visudo -cf "$SUDOERS_FILE"

if [[ ! -f /etc/tennis/ops_alert.env ]]; then
  cat >/etc/tennis/ops_alert.env <<'EOF'
# MAX_BOT_TOKEN=…  (или возьмётся из Environment= unit pocketbase)
# OPS_ALERT_MAX_IDS перекрывает config/ops_alert_recipients.env при необходимости
EOF
  chmod 600 /etc/tennis/ops_alert.env
  echo "Created /etc/tennis/ops_alert.env — set MAX_BOT_TOKEN if not in pocketbase unit."
fi

echo "Installed backup cron (v2) + watchdog + sudoers."
echo "Ensure: sqlite3, rclone, curl, python3, zip/unzip, gzip; rclone remote 'yandex'."
echo "See $SCRIPTS/BACKUP.md"
