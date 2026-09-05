#!/usr/bin/env bash
# Суточный бэкап pb_data/storage/ на Яндекс.Диск (зеркало).
# Cron: 00:00 МСК. Без --force пропускает, если нет файлов новее последнего успешного бэкапа.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=backup_common.sh
source "$SCRIPT_DIR/backup_common.sh"

backup_parse_args "$@"

REMOTE_STORAGE="$REMOTE_ROOT/storage"
LOCAL_STORAGE="$PB_DATA_DIR/storage"

run_storage_backup() {
  if [[ ! -d "$LOCAL_STORAGE" ]]; then
    echo "[backup-media] storage dir missing: $LOCAL_STORAGE"
    mkdir -p "$LOCAL_STORAGE"
  fi

  if [[ "$FORCE" -eq 0 ]] && media_unchanged_since_last_backup; then
    echo "[backup-media] no new files since last backup, skip"
    return 0
  fi

  echo "[backup-media] syncing $LOCAL_STORAGE -> $REMOTE_STORAGE/"
  rclone_sync "$LOCAL_STORAGE/" "$REMOTE_STORAGE/"

  if [[ "$DRY_RUN" -eq 0 ]]; then
    touch_media_ok
  fi

  echo "[backup-media] done"
}

with_flock media run_storage_backup
