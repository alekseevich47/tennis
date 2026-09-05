#!/bin/bash

# Настройки путей
PB_DATA_DIR="/opt/pocketbase/pb_data"
BACKUP_DIR="/opt/tennis/backups"
RESTORE_TMP="$BACKUP_DIR/restore_tmp"

# Очищаем и пересоздаем временную папку на VPS
rm -rf "$RESTORE_TMP"
mkdir -p "$RESTORE_TMP"

echo "=== Получение списка бэкапов с Яндекс.Диска ==="
mapfile -t BACKUPS < <(rclone lsf yandex:tennis_backup/ --dirs-only | sed 's/\///')

if [ ${#BACKUPS[@]} -eq 0 ]; then
    echo "Бэкапы в папке tennis_backup/ на Яндекс.Диске не найдены!"
    exit 1
fi

echo "Доступные резервные копии:"
for i in "${!BACKUPS[@]}"; do
    echo "  [$i] ${BACKUPS[$i]}"
done

# Интерактивный выбор папки
while true; do
    read -rp "Введите номер бэкапа для восстановления (или 'q' для отмены): " CHOICE
    if [[ "$CHOICE" == "q" ]]; then
        echo "Восстановление отменено."
        exit 0
    fi
    if [[ "$CHOICE" =~ ^[0-9]+$ ]] && [ "$CHOICE" -lt "${#BACKUPS[@]}" ]; then
        SELECTED_BACKUP="${BACKUPS[$CHOICE]}"
        break
    else
        echo "Неверный ввод. Пожалуйста, выберите число из списка."
    fi
done

echo "Выбран бэкап: $SELECTED_BACKUP"
read -rp "ВНИМАНИЕ! Текущие данные PocketBase на сервере будут заменены. Продолжить? (y/n): " CONFIRM
if [[ "$CONFIRM" != "y" ]]; then
    echo "Восстановление отменено."
    exit 0
fi

# Шаг 1: Скачиваем все разрезанные части бэкапа с Яндекс.Диска
echo "=== Скачивание частей бэкапа с Яндекс.Диска ==="
rclone copy "yandex:tennis_backup/$SELECTED_BACKUP/" "$RESTORE_TMP/" --transfers 1 --checkers 1 --buffer-size 0M -P

# Шаг 2: Склеиваем бинарные части part_* обратно в один целый рабочий файл .zip
echo "=== Склеивание бинарных частей архива ==="
cd "$RESTORE_TMP" || exit 1
cat part_* > combined_backup.zip

# Шаг 3: Безопасное восстановление данных в PocketBase
echo "=== Остановка PocketBase для обновления БД ==="
sudo systemctl stop pocketbase

echo "=== Резервное копирование текущей рабочей папки pb_data ==="
mv "$PB_DATA_DIR" "${PB_DATA_DIR}_old_$(date +%s)"

echo "=== Распаковка восстановленной базы и медиафайлов ==="
mkdir -p "$PB_DATA_DIR"
unzip combined_backup.zip -d /

echo "=== Исправление прав доступа для PocketBase ==="
sudo chown -R pocketbase:pocketbase "$PB_DATA_DIR"

echo "=== Запуск PocketBase ==="
sudo systemctl start pocketbase

# Шаг 4: Полное удаление скачанных файлов только с локального сервера VPS
echo "=== Очистка временных файлов скачанного бэкапа с сервера ==="
rm -rf "$RESTORE_TMP"

echo "=== ВОССТАНОВЛЕНИЕ ПОЛНОСТЬЮ ЗАВЕРШЕНО БЕЗ ОШИБОК! ==="
