#!/usr/bin/env bash
# Частый бэкап только data.db (+ auxiliary.db) на все REMOTE_ROOTS (Yandex / VK …).
# Cron: каждые 15 мин. Без --force пропускает тик, если БД не менялась.
# Успех = ≥1 remote OK; при любом FAIL — MAX ops-алерт.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=backup_common.sh
source "$SCRIPT_DIR/backup_common.sh"

backup_parse_args "$@"

DB_KEEP_COUNT="${DB_KEEP_COUNT:-96}"
DB_MAX_AGE="${DB_MAX_AGE:-14d}"

prune_db_on_remote() {
  local remote_db="$1"
  mapfile -t remote_files < <(rclone lsf "$remote_db/" --files-only 2>/dev/null | grep -E '^data_.*\.db\.gz$' | sort -r || true)
  if [[ ${#remote_files[@]} -gt $DB_KEEP_COUNT ]]; then
    local i
    for ((i = DB_KEEP_COUNT; i < ${#remote_files[@]}; i++)); do
      rclone deletefile "$remote_db/${remote_files[$i]}" || true
      local aux="auxiliary_${remote_files[$i]#data_}"
      rclone deletefile "$remote_db/$aux" 2>/dev/null || true
    done
  fi
  rclone delete "$remote_db/" --min-age "$DB_MAX_AGE" || true
}

run_db_backup() {
  if [[ "$FORCE" -eq 0 ]] && db_unchanged_since_last_backup; then
    echo "[backup-db] no changes since last backup, skip"
    return 0
  fi

  local tmp_dir
  tmp_dir=$(mktemp -d "$BACKUP_DIR/db_tmp_XXXXXX")
  # shellcheck disable=SC2064
  trap 'rm -rf "$tmp_dir"' RETURN

  echo "[backup-db] creating consistent SQLite snapshot…"
  sqlite_backup_file "$PB_DATA_DIR/data.db" "$tmp_dir/data.db"
  gzip -9 -c "$tmp_dir/data.db" >"$tmp_dir/data_${TIMESTAMP}.db.gz"
  rm -f "$tmp_dir/data.db"

  if [[ -f "$PB_DATA_DIR/auxiliary.db" ]]; then
    sqlite_backup_file "$PB_DATA_DIR/auxiliary.db" "$tmp_dir/auxiliary.db"
    gzip -9 -c "$tmp_dir/auxiliary.db" >"$tmp_dir/auxiliary_${TIMESTAMP}.db.gz"
    rm -f "$tmp_dir/auxiliary.db"
  fi

  echo "[backup-db] uploading to remotes:"
  backup_remote_roots | sed 's/^/  - /'

  if ! rclone_mirror_copy "$tmp_dir/" "db"; then
    echo "[backup-db] all remotes failed" >&2
    return 1
  fi

  if [[ "$DRY_RUN" -eq 0 ]]; then
    save_db_fingerprint
    local root
    while IFS= read -r root; do
      [[ -n "$root" ]] || continue
      echo "[backup-db] prune ${root%/}/db/"
      prune_db_on_remote "${root%/}/db" || true
    done < <(backup_remote_roots)
  fi

  echo "[backup-db] done: data_${TIMESTAMP}.db.gz"
}

with_flock db run_db_backup
