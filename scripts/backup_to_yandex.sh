#!/usr/bin/env bash
# Полный weekly-архив: консистентная БД + storage/ → Яндекс.Диск (full/).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=backup_common.sh
source "$SCRIPT_DIR/backup_common.sh"

backup_parse_args "$@"

REMOTE_FULL="$REMOTE_ROOT/full"
FULL_MAX_AGE="${FULL_MAX_AGE:-14d}"

run_full_backup() {
  local stamp="$TIMESTAMP"
  local work_dir="$BACKUP_DIR/full_work_$stamp"
  local split_dir="$BACKUP_DIR/split_$stamp"
  local zip_path="$BACKUP_DIR/full_backup_$stamp.zip"
  local pb_snapshot="$work_dir/pb_data"

  rm -rf "$work_dir" "$split_dir"
  mkdir -p "$pb_snapshot" "$split_dir"

  echo "[backup-full] consistent SQLite snapshot…"
  sqlite_backup_file "$PB_DATA_DIR/data.db" "$pb_snapshot/data.db"
  if [[ -f "$PB_DATA_DIR/auxiliary.db" ]]; then
    sqlite_backup_file "$PB_DATA_DIR/auxiliary.db" "$pb_snapshot/auxiliary.db"
  fi

  if [[ -d "$PB_DATA_DIR/storage" ]]; then
    echo "[backup-full] copying storage/…"
    cp -a "$PB_DATA_DIR/storage" "$pb_snapshot/storage"
  else
    mkdir -p "$pb_snapshot/storage"
  fi

  # Optional types.d.ts if present (harmless)
  if [[ -f "$PB_DATA_DIR/types.d.ts" ]]; then
    cp -a "$PB_DATA_DIR/types.d.ts" "$pb_snapshot/types.d.ts"
  fi

  echo "[backup-full] zipping…"
  # Store as absolute-looking path opt/pocketbase/pb_data so unzip -d / restores like before
  (
    cd "$work_dir"
    mkdir -p "opt/pocketbase"
    mv pb_data "opt/pocketbase/pb_data"
    zip -r "$zip_path" "opt/pocketbase/pb_data"
  )

  echo "[backup-full] splitting to 15MB parts…"
  split -b 15m "$zip_path" "$split_dir/part_"

  echo "[backup-full] uploading to $REMOTE_FULL/backup_$stamp/"
  rclone_copy "$split_dir/" "$REMOTE_FULL/backup_$stamp/"

  rm -rf "$work_dir" "$split_dir"
  rm -f "$zip_path"

  if [[ "$DRY_RUN" -eq 0 ]]; then
    echo "[backup-full] pruning full/ older than $FULL_MAX_AGE…"
    rclone delete "$REMOTE_FULL/" --min-age "$FULL_MAX_AGE" || true
    rclone rmdirs "$REMOTE_FULL/" --leave-root || true
  fi

  echo "[backup-full] done: full/backup_$stamp/"
}

with_flock full run_full_backup
