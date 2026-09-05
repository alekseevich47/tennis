#!/bin/bash

# Настройки путей
PB_DATA_DIR="/opt/pocketbase/pb_data"
BACKUP_DIR="/opt/tennis/backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Папка для частей текущего бэкапа на сервере
TMP_SPLIT_DIR="$BACKUP_DIR/split_$TIMESTAMP"
mkdir -p "$TMP_SPLIT_DIR"

# Шаг 1: Создаем ОДИН обычный целый архив
zip -r "$BACKUP_DIR/full_backup_$TIMESTAMP.zip" "$PB_DATA_DIR" -x "$PB_DATA_DIR/backups/*"

# Шаг 2: Режем этот целый готовый файл на куски по 15 Мегабайт
# (split создаст файлы: part_aa, part_ab, part_ac и т.д. внутри временной папки)
split -b 15m "$BACKUP_DIR/full_backup_$TIMESTAMP.zip" "$TMP_SPLIT_DIR/part_"

# Шаг 3: Поочередно загружаем каждый кусочек в индивидуальную папку на Яндекс.Диске
rclone copy "$TMP_SPLIT_DIR/" yandex:tennis_backup/backup_$TIMESTAMP/ --transfers 1 --checkers 1 --buffer-size 0M

# Шаг 4: Полностью удаляем временные файлы с VPS
rm -rf "$TMP_SPLIT_DIR"
rm -f "$BACKUP_DIR/full_backup_$TIMESTAMP.zip"

# Шаг 5: Очистка старых бэкапов в Облаке старше 14 дней
rclone delete yandex:tennis_backup/ --min-age 14d
rclone rmdirs yandex:tennis_backup/ --leave-root
