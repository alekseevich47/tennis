#!/usr/bin/env bash
# Восстановление pb_data/storage/ из зеркала <REMOTE_ROOT>/storage/.
# Интерактивно или: RESTORE_CONFIRM=y RESTORE_STOP_PB=y
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=backup_common.sh
source "$SCRIPT_DIR/backup_common.sh"

REMOTE_STORAGE="$REMOTE_ROOT/storage"
LOCAL_STORAGE="$PB_DATA_DIR/storage"

echo "=== Восстановление STORAGE (storage/) ==="
echo "Источник: $REMOTE_STORAGE/"
echo "Назначение: $LOCAL_STORAGE/"
echo "Рекомендуется остановить PocketBase перед sync."

STOP_PB="${RESTORE_STOP_PB:-}"
CONFIRM="${RESTORE_CONFIRM:-}"
if [[ -z "$STOP_PB" ]]; then
  read -rp "Остановить PocketBase сейчас? (y/n): " STOP_PB
fi
if [[ -z "$CONFIRM" ]]; then
  read -rp "Продолжить sync? (y/n): " CONFIRM
fi
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

echo "=== Восстановление STORAGE завершено ==="
