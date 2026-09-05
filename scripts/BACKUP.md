# Бэкапы и восстановление PocketBase

Трёхслойная схема: частая БД, суточное медиа, недельный полный архив → Яндекс.Диск (`rclone` remote `yandex`).

## Слои

| Слой | Скрипт | Расписание | Remote | Условие |
|------|--------|------------|--------|---------|
| **DB** | `backup_db_to_yandex.sh` | каждые 15 мин | `tennis_backup/db/` | только если менялись `data.db` / `-wal` (или `--force`) |
| **MEDIA** | `backup_storage_to_yandex.sh` | 00:00 МСК (21:00 UTC) | `tennis_backup/storage/` | только если есть файлы новее последнего успешного sync (или `--force`) |
| **FULL** | `backup_to_yandex.sh` | вс 00:00 МСК | `tennis_backup/full/backup_*/` | всегда |

БД копируется через `sqlite3 … ".backup"` (консистентный снимок при работающем PocketBase), не zip «горячих» `-wal`/`-shm`.

Ручные кнопки в админ-панели приложения всегда вызывают скрипты с `--force`.

## Установка на сервере

```bash
# зависимости
sudo apt-get install -y sqlite3 zip unzip gzip
# rclone + remote «yandex» для root (и доступ к Я.Диску)

sudo chmod +x /opt/tennis/scripts/*.sh
sudo /opt/tennis/scripts/install_backup_cron.sh
```

`install_backup_cron.sh` ставит:

1. crontab (root) с тремя задачами и логами `/var/log/tennis-backup-*.log`
2. sudoers: пользователь `pocketbase` может без пароля запускать только DB/MEDIA скрипты (кнопки админки)

Проверка:

```bash
sudo -u pocketbase sudo -n /opt/tennis/scripts/backup_db_to_yandex.sh --force --dry-run
crontab -l | grep tennis-backup
```

Опционально env для PocketBase: `BACKUP_SCRIPTS_DIR=/opt/tennis/scripts` (дефолт тот же путь).

## Ручной запуск

```bash
sudo /opt/tennis/scripts/backup_db_to_yandex.sh --force
sudo /opt/tennis/scripts/backup_storage_to_yandex.sh --force
sudo /opt/tennis/scripts/backup_to_yandex.sh
```

Из приложения (модератор): **Админ-панель → «Бэкап БД» / «Бэкап медиа»**.

## Восстановление

### Только БД (абонементы, тренировки, посты…)

```bash
sudo /opt/tennis/scripts/restore_db_from_yandex.sh
```

Выбрать `data_….db.gz` → stop PB → подмена `data.db` (+ `auxiliary.db` при наличии) → удаление `-wal`/`-shm` → start.

### Только медиа

```bash
sudo /opt/tennis/scripts/restore_storage_from_yandex.sh
```

`rclone sync` с `tennis_backup/storage/` в `/opt/pocketbase/pb_data/storage/`.

### Полный disaster (БД + медиа)

```bash
sudo /opt/tennis/scripts/restore_from_yandex.sh
```

Список из `tennis_backup/full/` (legacy: старые `tennis_backup/backup_*` тоже подхватываются).

### Новый сервер, старый недоступен

1. Bootstrap / установить PocketBase, rclone, скрипты.
2. `restore_db_from_yandex.sh` — свежий снимок БД.
3. `restore_storage_from_yandex.sh` — медиа.
4. Либо один `restore_from_yandex.sh` из weekly full (RPO до недели по медиа/БД внутри архива; для актуальной БД лучше шаг 2 поверх или вместо).
5. `chown` уже в скриптах; проверить логин, абонементы, картинки.

Склейка слоёв = обычная папка `pb_data/`:

```
pb_data/
  data.db
  auxiliary.db   # опционально
  storage/
```

## RPO

- Бизнес-данные (коллекции): до ~15 минут.
- Файлы в `storage/`: до ~1 суток (если не жали кнопку «Бэкап медиа»).
- Full: аварийный снимок до 14 дней хранения.

## Важно

- Не копируйте вручную только `data.db` без `.backup` — игнорирование `-wal` даёт битый снимок.
- Continuous replication (Litestream) в этой схеме не используется; при необходимости — отдельный S3-совместимый бакет.
- Логи cron: `tail -f /var/log/tennis-backup-db.log`
