#!/usr/bin/env bash
# Общие пути и хелперы для backup/restore. Подключать: source "$(dirname "$0")/backup_common.sh"

set -euo pipefail

PB_DATA_DIR="${PB_DATA_DIR:-/opt/pocketbase/pb_data}"
BACKUP_DIR="${BACKUP_DIR:-/opt/tennis/backups}"
APP_DIR="${APP_DIR:-/opt/tennis}"
PB_SERVICE="${PB_SERVICE:-pocketbase}"
PB_USER="${PB_USER:-pocketbase}"

# Явный env REMOTE_ROOT / REMOTE_ROOTS не перетираем файлом backup_remotes.env
_REMOTE_ROOT_WAS_SET=0
_REMOTE_ROOTS_WAS_SET=0
if [[ -n "${REMOTE_ROOT:-}" ]]; then
  _REMOTE_ROOT_WAS_SET=1
fi
if [[ -n "${REMOTE_ROOTS:-}" ]]; then
  _REMOTE_ROOTS_WAS_SET=1
fi
_SAVED_REMOTE_ROOT="${REMOTE_ROOT:-}"
_SAVED_REMOTE_ROOTS="${REMOTE_ROOTS:-}"
REMOTE_ROOT="${REMOTE_ROOT:-yandex:tennis_backup}"

_BACKUP_COMMON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_ALERT_SCRIPT="${OPS_ALERT_SCRIPT:-$_BACKUP_COMMON_DIR/ops_alert_max.sh}"

# Опционально: /etc/tennis/backup_remotes.env или config/backup_remotes.env
# REMOTE_ROOTS=yandex:tennis_backup,mailru:tennis_backup
# CLOUD_YANDEX=… CLOUD_VK=mailru:tennis_backup
for _br in /etc/tennis/backup_remotes.env "$APP_DIR/config/backup_remotes.env"; do
  if [[ -f "$_br" ]]; then
    # shellcheck disable=SC1090
    set -a
    # shellcheck source=/dev/null
    source "$_br"
    set +a
    break
  fi
done
unset _br

if [[ "$_REMOTE_ROOT_WAS_SET" -eq 1 ]]; then
  REMOTE_ROOT="$_SAVED_REMOTE_ROOT"
fi
if [[ "$_REMOTE_ROOTS_WAS_SET" -eq 1 ]]; then
  REMOTE_ROOTS="$_SAVED_REMOTE_ROOTS"
fi
unset _SAVED_REMOTE_ROOT _SAVED_REMOTE_ROOTS

STATE_DIR="$BACKUP_DIR/state"
LOCKS_DIR="$BACKUP_DIR/locks"
TIMESTAMP="${TIMESTAMP:-$(date +"%Y-%m-%d_%H-%M-%S")}"

RCLONE_FLAGS=(--transfers 1 --checkers 1 --buffer-size 0M)

mkdir -p "$BACKUP_DIR" "$STATE_DIR" "$LOCKS_DIR"

# Список remote roots (по одному на строку). Успех upload = ≥1 OK; алерт если любой FAIL.
backup_remote_roots() {
  local raw="${REMOTE_ROOTS:-}"
  if [[ -z "$raw" ]]; then
    raw="${REMOTE_ROOT:-yandex:tennis_backup}"
  fi
  raw="${raw//,/ }"
  local r
  for r in $raw; do
    r="${r#"${r%%[![:space:]]*}"}"
    r="${r%"${r##*[![:space:]]}"}"
    [[ -n "$r" ]] || continue
    printf '%s\n' "$r"
  done
}

# Первый remote — для restore по умолчанию и совместимости.
primary_remote_root() {
  backup_remote_roots | head -n 1
}

# Облака в UI: yandex / vk (Mail Cloud). rclone: CLOUD_YANDEX / CLOUD_VK или дефолты.
CLOUD_YANDEX="${CLOUD_YANDEX:-yandex:tennis_backup}"
CLOUD_VK="${CLOUD_VK:-mailru:tennis_backup}"

cloud_root() {
  case "${1:-}" in
    yandex) printf '%s' "$CLOUD_YANDEX" ;;
    vk|mailru) printf '%s' "$CLOUD_VK" ;;
    *)
      echo "cloud_root: unknown cloud '$1' (yandex|vk)" >&2
      return 1
      ;;
  esac
}

# cloud id для remote root path (yandex:… → yandex, mailru:… → vk)
cloud_id_for_root() {
  local root="${1:-}"
  local name="${root%%:*}"
  case "$name" in
    yandex) echo yandex ;;
    mailru|vk) echo vk ;;
    *) echo "$name" ;;
  esac
}

# REMOTE_ROOTS для выбора: yandex | vk | both
set_remote_roots_for_cloud() {
  case "${1:-}" in
    yandex) REMOTE_ROOTS="$(cloud_root yandex)" ;;
    vk) REMOTE_ROOTS="$(cloud_root vk)" ;;
    both|all|оба)
      REMOTE_ROOTS="$(cloud_root yandex),$(cloud_root vk)"
      ;;
    *)
      echo "set_remote_roots_for_cloud: use yandex|vk|both" >&2
      return 1
      ;;
  esac
  REMOTE_ROOT="$(primary_remote_root)"
}

if [[ "$_REMOTE_ROOT_WAS_SET" -eq 0 ]] && [[ -n "${REMOTE_ROOTS:-}" ]]; then
  REMOTE_ROOT="$(primary_remote_root)"
fi
unset _REMOTE_ROOT_WAS_SET

ops_alert_backup() {
  local msg="${1:-}"
  [[ -n "$msg" ]] || return 0
  if [[ ! -x "$OPS_ALERT_SCRIPT" ]] && [[ ! -f "$OPS_ALERT_SCRIPT" ]]; then
    echo "[backup] ops alert script missing: $OPS_ALERT_SCRIPT" >&2
    return 0
  fi
  bash "$OPS_ALERT_SCRIPT" "$msg" || true
}

# Копирует src в <remote>/<rel>/ на каждый remote.
# Exit 0 если ≥1 OK; 1 если все FAIL. При любом FAIL — MAX ops-алерт.
rclone_mirror_copy() {
  local src="$1"
  local rel="$2"
  local ok=0
  local fail=0
  local -a ok_names=()
  local -a fail_names=()
  local root dest

  while IFS= read -r root; do
    [[ -n "$root" ]] || continue
    dest="${root%/}/${rel}"
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "[dry-run] rclone copy $src -> $dest/"
      ok=$((ok + 1))
      ok_names+=("$root")
      continue
    fi
    if rclone copy "$src" "$dest/" "${RCLONE_FLAGS[@]}"; then
      echo "[backup] upload OK -> $dest/"
      ok=$((ok + 1))
      ok_names+=("$root")
    else
      echo "[backup] upload FAIL -> $dest/" >&2
      fail=$((fail + 1))
      fail_names+=("$root")
    fi
  done < <(backup_remote_roots)

  if [[ "$fail" -gt 0 ]]; then
    local msg
    if [[ "$ok" -eq 0 ]]; then
      msg="tennis backup ($rel): FAILED on ALL remotes: ${fail_names[*]}"
    else
      msg="tennis backup ($rel): partial — OK: ${ok_names[*]}; FAIL: ${fail_names[*]}"
    fi
    echo "[backup] $msg" >&2
    if [[ "$DRY_RUN" -eq 0 ]]; then
      ops_alert_backup "$msg"
    fi
  fi

  [[ "$ok" -gt 0 ]]
}

# sync src → <remote>/<rel>/ на каждый remote. Политика как у rclone_mirror_copy.
rclone_mirror_sync() {
  local src="$1"
  local rel="$2"
  local ok=0
  local fail=0
  local -a ok_names=()
  local -a fail_names=()
  local root dest

  while IFS= read -r root; do
    [[ -n "$root" ]] || continue
    dest="${root%/}/${rel}"
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "[dry-run] rclone sync $src -> $dest/"
      ok=$((ok + 1))
      ok_names+=("$root")
      continue
    fi
    if rclone sync "$src" "$dest/" "${RCLONE_FLAGS[@]}"; then
      echo "[backup] sync OK -> $dest/"
      ok=$((ok + 1))
      ok_names+=("$root")
    else
      echo "[backup] sync FAIL -> $dest/" >&2
      fail=$((fail + 1))
      fail_names+=("$root")
    fi
  done < <(backup_remote_roots)

  if [[ "$fail" -gt 0 ]]; then
    local msg
    if [[ "$ok" -eq 0 ]]; then
      msg="tennis backup ($rel): FAILED on ALL remotes: ${fail_names[*]}"
    else
      msg="tennis backup ($rel): partial — OK: ${ok_names[*]}; FAIL: ${fail_names[*]}"
    fi
    echo "[backup] $msg" >&2
    if [[ "$DRY_RUN" -eq 0 ]]; then
      ops_alert_backup "$msg"
    fi
  fi

  [[ "$ok" -gt 0 ]]
}

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

# SQLite Online Backup API (не cp/zip горячего data.db и не -wal/-shm).
# https://www.sqlite.org/backup.html — консистентный снимок при живом PocketBase.
sqlite_backup_file() {
  local src="$1"
  local dest="$2"
  if [[ ! -f "$src" ]]; then
    echo "SQLite source missing: $src" >&2
    return 1
  fi
  if [[ "$src" == "$dest" ]]; then
    echo "sqlite_backup_file: src and dest must differ" >&2
    return 1
  fi
  case "$src" in
    *-wal|*-shm)
      echo "sqlite_backup_file: refuse sidecars ($src); use main .db only" >&2
      return 1
      ;;
  esac
  if ! command -v sqlite3 >/dev/null 2>&1; then
    echo "sqlite3 is required (Online Backup API)" >&2
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
