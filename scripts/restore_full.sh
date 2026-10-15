#!/usr/bin/env bash
# Полное восстановление из <REMOTE_ROOT>/full/backup_* (или legacy backup_*).
# Интерактивно или: RESTORE_SELECTED=backup_… RESTORE_CONFIRM=y
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=backup_common.sh
source "$SCRIPT_DIR/backup_common.sh"

REMOTE_FULL="$REMOTE_ROOT/full"
RESTORE_TMP="$BACKUP_DIR/restore_tmp"

rm -rf "$RESTORE_TMP"
mkdir -p "$RESTORE_TMP"

echo "=== Список full-бэкапов ($REMOTE_FULL) ==="
mapfile -t BACKUPS < <(rclone lsf "$REMOTE_FULL/" --dirs-only 2>/dev/null | sed 's/\///' | sort -r || true)

LEGACY_ROOT=0
if [[ ${#BACKUPS[@]} -eq 0 ]]; then
  echo "(full/ пуст — ищем legacy tennis_backup/backup_*)"
  mapfile -t BACKUPS < <(rclone lsf "$REMOTE_ROOT/" --dirs-only 2>/dev/null | sed 's/\///' | grep -E '^backup_' | sort -r || true)
  LEGACY_ROOT=1
fi

if [[ ${#BACKUPS[@]} -eq 0 ]]; then
  echo "Полные бэкапы не найдены."
  exit 1
fi

SELECTED_BACKUP="${RESTORE_SELECTED:-}"
if [[ -z "$SELECTED_BACKUP" ]]; then
  echo "Доступные резервные копии:"
  for i in "${!BACKUPS[@]}"; do
    echo "  [$i] ${BACKUPS[$i]}"
  done
  while true; do
    read -rp "Введите номер бэкапа для восстановления (или 'q' для отмены): " CHOICE
    if [[ "$CHOICE" == "q" ]]; then
      echo "Восстановление отменено."
      exit 0
    fi
    if [[ "$CHOICE" =~ ^[0-9]+$ ]] && [[ "$CHOICE" -lt ${#BACKUPS[@]} ]]; then
      SELECTED_BACKUP="${BACKUPS[$CHOICE]}"
      break
    fi
    echo "Неверный ввод. Пожалуйста, выберите число из списка."
  done
else
  found=0
  for f in "${BACKUPS[@]}"; do
    if [[ "$f" == "$SELECTED_BACKUP" ]]; then
      found=1
      break
    fi
  done
  if [[ "$found" -ne 1 ]]; then
    echo "RESTORE_SELECTED не найден: $SELECTED_BACKUP" >&2
    exit 1
  fi
fi

echo "Выбран бэкап: $SELECTED_BACKUP"
CONFIRM="${RESTORE_CONFIRM:-}"
if [[ -z "$CONFIRM" ]]; then
  read -rp "ВНИМАНИЕ! Текущие данные PocketBase на сервере будут заменены. Продолжить? (y/n): " CONFIRM
fi
if [[ "$CONFIRM" != "y" ]]; then
  echo "Восстановление отменено."
  exit 0
fi

if [[ "$LEGACY_ROOT" -eq 1 ]]; then
  REMOTE_PATH="$REMOTE_ROOT/$SELECTED_BACKUP"
else
  REMOTE_PATH="$REMOTE_FULL/$SELECTED_BACKUP"
fi

echo "=== Скачивание частей бэкапа ==="
rclone copy "$REMOTE_PATH/" "$RESTORE_TMP/" "${RCLONE_FLAGS[@]}" -P

echo "=== Склеивание бинарных частей архива ==="
cd "$RESTORE_TMP" || exit 1
# shellcheck disable=SC2012
mapfile -t PARTS < <(ls -1 part_* 2>/dev/null | sort)
if [[ ${#PARTS[@]} -eq 0 ]]; then
  echo "Файлы part_* не найдены в скачанном бэкапе."
  exit 1
fi
cat "${PARTS[@]}" >combined_backup.zip

echo "=== Остановка PocketBase для обновления БД ==="
stop_pocketbase

echo "=== Резервное копирование текущей рабочей папки pb_data ==="
if [[ -d "$PB_DATA_DIR" ]]; then
  mv "$PB_DATA_DIR" "${PB_DATA_DIR}_old_$(date +%s)"
fi

echo "=== Распаковка восстановленной базы и медиафайлов ==="
mkdir -p "$PB_DATA_DIR"
unzip -o combined_backup.zip -d /

clear_sqlite_sidecars "$PB_DATA_DIR/data.db"
clear_sqlite_sidecars "$PB_DATA_DIR/auxiliary.db"

echo "=== Исправление прав доступа для PocketBase ==="
chown_pb_data

echo "=== Запуск PocketBase ==="
start_pocketbase

echo "=== Очистка временных файлов ==="
rm -rf "$RESTORE_TMP"

echo "=== ВОССТАНОВЛЕНИЕ ПОЛНОСТЬЮ ЗАВЕРШЕНО ==="
