#!/usr/bin/env bash
# Общие пути и хелперы для backup/restore. Подключать: source "$(dirname "$0")/backup_common.sh"

set -euo pipefail

PB_DATA_DIR="${PB_DATA_DIR:-/opt/pocketbase/pb_data}"
BACKUP_DIR="${BACKUP_DIR:-/opt/tennis/backups}"
REMOTE_ROOT="${REMOTE_ROOT:-yandex:tennis_backup}"
PB_SERVICE="${PB_SERVICE:-pocketbase}"
PB_USER="${PB_USER:-pocketbase}"

STATE_DIR="$BACKUP_DIR/state"
LOCKS_DIR="$BACKUP_DIR/locks"
TIMESTAMP="${TIMESTAMP:-$(date +"%Y-%m-%d_%H-%M-%S")}"

RCLONE_FLAGS=(--transfers 1 --checkers 1 --buffer-size 0M)

mkdir -p "$BACKUP_DIR" "$STATE_DIR" "$LOCKS_DIR"

FORCE=0
DRY_RUN=0

backup_parse_args() {
  FORCE=0
  DRY_RUN=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --force) FORCE=1 ;;
      --dry-run) DRY_RUN=1 ;;
      -h|--help)
        echo "Usage: $0 [--force] [--dry-run]"
        exit 0
        ;;
      *)
        echo "Unknown argument: $1" >&2
        exit 1
        ;;
    esac
    shift
  done
}

# Fingerprint data.db + WAL (mtime + size). Empty WAL file is ok.
db_fingerprint() {
  local db="$PB_DATA_DIR/data.db"
  local wal="$PB_DATA_DIR/data.db-wal"
  local line=""
  if [[ -f "$db" ]]; then
    line+=$(stat -c '%Y %s' "$db" 2>/dev/null || stat -f '%m %z' "$db")
  else
    line+="missing"
  fi
  line+="|"
  if [[ -f "$wal" ]]; then
    line+=$(stat -c '%Y %s' "$wal" 2>/dev/null || stat -f '%m %z' "$wal")
  else
    line+="nowal"
  fi
  printf '%s' "$line"
}

save_db_fingerprint() {
  db_fingerprint >"$STATE_DIR/db.fingerprint"
}

db_unchanged_since_last_backup() {
  [[ -f "$STATE_DIR/db.fingerprint" ]] || return 1
  local now prev
  now=$(db_fingerprint)
  prev=$(cat "$STATE_DIR/db.fingerprint")
  [[ "$now" == "$prev" ]]
}

# True if storage/ has no file newer than last successful media backup marker.
media_unchanged_since_last_backup() {
  local marker="$STATE_DIR/last_media_ok"
  [[ -f "$marker" ]] || return 1
  local storage="$PB_DATA_DIR/storage"
  [[ -d "$storage" ]] || return 0
  local found
  found=$(find "$storage" -type f -newer "$marker" -print -quit 2>/dev/null || true)
  if [[ -n "$found" ]]; then
    return 1
  fi
  return 0
}

touch_media_ok() {
  touch "$STATE_DIR/last_media_ok"
}

# Consistent online copy of SQLite DB into dest path (no gzip).
sqlite_backup_file() {
  local src="$1"
  local dest="$2"
  if [[ ! -f "$src" ]]; then
    echo "SQLite source missing: $src" >&2
    return 1
  fi
  if ! command -v sqlite3 >/dev/null 2>&1; then
    echo "sqlite3 is required" >&2
    return 1
  fi
  sqlite3 "$src" ".backup '$dest'"
}

with_flock() {
  local lock_name="$1"
  shift
  local lock_file="$LOCKS_DIR/${lock_name}.lock"
  (
    flock -n 200 || {
      echo "[backup] another $lock_name is running, skip"
      exit 0
    }
    "$@"
  ) 200>"$lock_file"
}

rclone_copy() {
  local src="$1"
  local dest="$2"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] rclone copy $src -> $dest"
    return 0
  fi
  rclone copy "$src" "$dest" "${RCLONE_FLAGS[@]}"
}

rclone_sync() {
  local src="$1"
  local dest="$2"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] rclone sync $src -> $dest"
    return 0
  fi
  rclone sync "$src" "$dest" "${RCLONE_FLAGS[@]}"
}

stop_pocketbase() {
  sudo systemctl stop "$PB_SERVICE"
}

start_pocketbase() {
  sudo systemctl start "$PB_SERVICE"
}

chown_pb_data() {
  sudo chown -R "${PB_USER}:${PB_USER}" "$PB_DATA_DIR"
}

# Remove WAL/SHM so SQLite opens the restored main DB cleanly.
clear_sqlite_sidecars() {
  local base="$1"
  rm -f "${base}-wal" "${base}-shm"
}
