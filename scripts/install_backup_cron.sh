#!/usr/bin/env bash
# Установка crontab для трёхслойных бэкапов + sudoers для кнопок админки.
# Запуск: sudo /opt/tennis/scripts/install_backup_cron.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/tennis}"
SCRIPTS="$APP_DIR/scripts"
BACKUP_DIR="${BACKUP_DIR:-/opt/tennis/backups}"
PB_USER="${PB_USER:-pocketbase}"

mkdir -p "$BACKUP_DIR/state" "$BACKUP_DIR/locks"
chmod +x "$SCRIPTS"/backup_*.sh "$SCRIPTS"/restore_*.sh "$SCRIPTS"/install_backup_cron.sh 2>/dev/null || true
chmod +x "$SCRIPTS/backup_common.sh" 2>/dev/null || true

# DB every 15 min; MEDIA 00:00 MSK (= 21:00 UTC); full Sunday 00:00 MSK
CRON_MARKER="# tennis-backup-v1"
CRON_BLOCK=$(cat <<EOF
$CRON_MARKER
*/15 * * * * $SCRIPTS/backup_db_to_yandex.sh >>/var/log/tennis-backup-db.log 2>&1
0 21 * * * $SCRIPTS/backup_storage_to_yandex.sh >>/var/log/tennis-backup-media.log 2>&1
0 21 * * 0 $SCRIPTS/backup_to_yandex.sh >>/var/log/tennis-backup-full.log 2>&1
EOF
)

EXISTING=$(crontab -l 2>/dev/null || true)
FILTERED=$(echo "$EXISTING" | grep -vF "$CRON_MARKER" | grep -vF "$SCRIPTS/backup_db_to_yandex.sh" | grep -vF "$SCRIPTS/backup_storage_to_yandex.sh" | grep -vF "$SCRIPTS/backup_to_yandex.sh" || true)
printf '%s\n%s\n' "$FILTERED" "$CRON_BLOCK" | crontab -

SUDOERS_FILE="/etc/sudoers.d/tennis-backup"
cat >"$SUDOERS_FILE" <<EOF
# Allow PocketBase service user to trigger backup scripts from admin UI
$PB_USER ALL=(root) NOPASSWD: $SCRIPTS/backup_db_to_yandex.sh, $SCRIPTS/backup_storage_to_yandex.sh
EOF
chmod 440 "$SUDOERS_FILE"
visudo -cf "$SUDOERS_FILE"

echo "Installed backup cron + sudoers."
echo "Ensure: sqlite3, rclone, zip/unzip, gzip; rclone remote 'yandex' configured for root."
echo "See $SCRIPTS/BACKUP.md"
