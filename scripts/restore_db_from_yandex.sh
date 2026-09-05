#!/usr/bin/env bash
# Восстановление data.db (и auxiliary.db) из tennis_backup/db/ на Яндекс.Диске.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=backup_common.sh
source "$SCRIPT_DIR/backup_common.sh"

REMOTE_DB="$REMOTE_ROOT/db"
RESTORE_TMP="$BACKUP_DIR/restore_db_tmp"

rm -rf "$RESTORE_TMP"
mkdir -p "$RESTORE_TMP"

echo "=== Список DB-бэкапов на Яндекс.Диске ==="
mapfile -t BACKUPS < <(rclone lsf "$REMOTE_DB/" --files-only 2>/dev/null | grep -E '^data_.*\.db\.gz$' | sort -r || true)

if [[ ${#BACKUPS[@]} -eq 0 ]]; then
  echo "Файлы data_*.db.gz в $REMOTE_DB/ не найдены."
  exit 1
fi

echo "Доступные снимки БД:"
for i in "${!BACKUPS[@]}"; do
  echo "  [$i] ${BACKUPS[$i]}"
done

SELECTED=""
while true; do
  read -rp "Номер бэкапа (или 'q' — отмена): " CHOICE
  if [[ "$CHOICE" == "q" ]]; then
    echo "Отменено."
    exit 0
  fi
  if [[ "$CHOICE" =~ ^[0-9]+$ ]] && [[ "$CHOICE" -lt ${#BACKUPS[@]} ]]; then
    SELECTED="${BACKUPS[$CHOICE]}"
    break
  fi
  echo "Неверный ввод."
done

echo "Выбран: $SELECTED"
read -rp "Текущий data.db будет заменён. Продолжить? (y/n): " CONFIRM
if [[ "$CONFIRM" != "y" ]]; then
  echo "Отменено."
  exit 0
fi

echo "=== Скачивание ==="
rclone copy "$REMOTE_DB/$SELECTED" "$RESTORE_TMP/" "${RCLONE_FLAGS[@]}" -P

AUX_NAME="auxiliary_${SELECTED#data_}"
# optional companion file
rclone copy "$REMOTE_DB/$AUX_NAME" "$RESTORE_TMP/" "${RCLONE_FLAGS[@]}" 2>/dev/null || true

gunzip -c "$RESTORE_TMP/$SELECTED" >"$RESTORE_TMP/data.db"
if [[ -f "$RESTORE_TMP/$AUX_NAME" ]]; then
  gunzip -c "$RESTORE_TMP/$AUX_NAME" >"$RESTORE_TMP/auxiliary.db"
fi

echo "=== Остановка PocketBase ==="
stop_pocketbase

echo "=== Подмена БД ==="
mkdir -p "$PB_DATA_DIR"
if [[ -f "$PB_DATA_DIR/data.db" ]]; then
  mv "$PB_DATA_DIR/data.db" "$PB_DATA_DIR/data.db.bak_$(date +%s)"
fi
cp -a "$RESTORE_TMP/data.db" "$PB_DATA_DIR/data.db"
clear_sqlite_sidecars "$PB_DATA_DIR/data.db"

if [[ -f "$RESTORE_TMP/auxiliary.db" ]]; then
  if [[ -f "$PB_DATA_DIR/auxiliary.db" ]]; then
    mv "$PB_DATA_DIR/auxiliary.db" "$PB_DATA_DIR/auxiliary.db.bak_$(date +%s)"
  fi
  cp -a "$RESTORE_TMP/auxiliary.db" "$PB_DATA_DIR/auxiliary.db"
  clear_sqlite_sidecars "$PB_DATA_DIR/auxiliary.db"
fi

chown_pb_data

echo "=== Запуск PocketBase ==="
start_pocketbase

rm -rf "$RESTORE_TMP"
echo "=== Восстановление БД завершено ==="
