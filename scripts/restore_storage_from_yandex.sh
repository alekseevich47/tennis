#!/usr/bin/env bash
# Восстановление pb_data/storage/ из зеркала tennis_backup/storage/ на Яндекс.Диске.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=backup_common.sh
source "$SCRIPT_DIR/backup_common.sh"

REMOTE_STORAGE="$REMOTE_ROOT/storage"
LOCAL_STORAGE="$PB_DATA_DIR/storage"

echo "=== Восстановление MEDIA (storage/) ==="
echo "Источник: $REMOTE_STORAGE/"
echo "Назначение: $LOCAL_STORAGE/"
echo "Рекомендуется остановить PocketBase перед sync."
read -rp "Остановить PocketBase сейчас? (y/n): " STOP_PB
read -rp "Продолжить sync? (y/n): " CONFIRM
if [[ "$CONFIRM" != "y" ]]; then
  echo "Отменено."
  exit 0
fi

if [[ "$STOP_PB" == "y" ]]; then
  stop_pocketbase
fi

mkdir -p "$LOCAL_STORAGE"
rclone sync "$REMOTE_STORAGE/" "$LOCAL_STORAGE/" "${RCLONE_FLAGS[@]}" -P
chown_pb_data

if [[ "$STOP_PB" == "y" ]]; then
  start_pocketbase
fi

echo "=== Восстановление MEDIA завершено ==="
