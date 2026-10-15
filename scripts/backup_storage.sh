#!/usr/bin/env bash
# Суточный бэкап pb_data/storage/ на все REMOTE_ROOTS (зеркало STORAGE).
# Cron: 00:00 МСК. Без --force пропускает, если нет файлов новее последнего успешного бэкапа.
# Успех = ≥1 remote OK; при любом FAIL — MAX ops-алерт.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=backup_common.sh
source "$SCRIPT_DIR/backup_common.sh"

backup_parse_args "$@"

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

  echo "[backup-media] syncing $LOCAL_STORAGE -> remotes (storage/):"
  backup_remote_roots | sed 's/^/  - /'

  if ! rclone_mirror_sync "$LOCAL_STORAGE/" "storage"; then
    echo "[backup-media] all remotes failed" >&2
    return 1
  fi

  if [[ "$DRY_RUN" -eq 0 ]]; then
    touch_media_ok
  fi

  echo "[backup-media] done"
}

with_flock media run_storage_backup
