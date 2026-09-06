# Бэкапы и восстановление PocketBase

Трёхслойная схема: частая БД, суточное медиа, недельный полный архив → Яндекс.Диск (`rclone` remote `yandex`).

## Слои

| Слой | Скрипт | Расписание | Remote | Условие |
|------|--------|------------|--------|---------|
| **DB** | `backup_db_to_yandex.sh` | **:03/:18/:33/:48** каждого часа | `tennis_backup/db/` | только если менялись `data.db` / `-wal` (или `--force`) |
| **MEDIA** | `backup_storage_to_yandex.sh` | 00:00 МСК (21:00 UTC) | `tennis_backup/storage/` | только если есть файлы новее последнего успешного sync (или `--force`) |
| **FULL** | `backup_to_yandex.sh` | вс 00:00 МСК | `tennis_backup/full/backup_*/` | всегда |
| **Watchdog** | `pocketbase_io_watchdog.sh` | каждые 5 мин | — | при `disk I/O error` → restart PB + MAX-алерт |

Расписание DB сдвинуто на +3 мин относительно `membership_lifecycle` (`*/15`), чтобы не бить в один тик по SQLite.

### БД только через SQLite Online Backup API

Канонический способ: `sqlite3 data.db ".backup '…'"` (`backup_common.sh` → `sqlite_backup_file`).

**Запрещено:** `zip`/`cp` живого `data.db`, копирование `data.db-wal` / `data.db-shm`. Иначе снимок может быть битым.

Ручные кнопки в админ-панели приложения всегда вызывают скрипты с `--force`.

## Установка на сервере

```bash
sudo apt-get install -y sqlite3 zip unzip gzip curl python3
# rclone + remote «yandex» для root

sudo chmod +x /opt/tennis/scripts/*.sh
sudo /opt/tennis/scripts/install_backup_cron.sh
```

`install_backup_cron.sh` ставит:

1. crontab (root): DB / MEDIA / FULL + watchdog
2. sudoers: `pocketbase` → DB/MEDIA скрипты (кнопки админки)
3. `/etc/tennis/ops_alert.env` (шаблон) — при необходимости `MAX_BOT_TOKEN=…` (иначе берётся из Environment unit `pocketbase`)

Получатели алертов: [`config/ops_alert_recipients.env`](../config/ops_alert_recipients.env) (`OPS_ALERT_MAX_IDS`).

Проверка:

```bash
sudo -u pocketbase sudo -n /opt/tennis/scripts/backup_db_to_yandex.sh --force --dry-run
crontab -l | grep -E 'tennis-backup|watchdog'
sudo /opt/tennis/scripts/ops_alert_max.sh "tennis ops alert test"
```

## Watchdog

При `disk I/O error` / `(522)` в journal за ~6 мин:

1. `systemctl restart pocketbase` (не чаще 1 раз / 15 мин)
2. Сообщение в MAX ботом **напрямую** (не через PB) списку из `OPS_ALERT_MAX_IDS`

Лог: `/var/log/tennis-pb-watchdog.log`

## Ручной запуск

```bash
sudo /opt/tennis/scripts/backup_db_to_yandex.sh --force
sudo /opt/tennis/scripts/backup_storage_to_yandex.sh --force
sudo /opt/tennis/scripts/backup_to_yandex.sh
```

Из приложения (модератор): **Админ-панель → «Бэкап БД» / «Бэкап медиа»**.

## Восстановление

### Только БД

```bash
sudo /opt/tennis/scripts/restore_db_from_yandex.sh
```

### Только медиа

```bash
sudo /opt/tennis/scripts/restore_storage_from_yandex.sh
```

### Полный disaster

```bash
sudo /opt/tennis/scripts/restore_from_yandex.sh
```

### Новый сервер

1. Bootstrap / PocketBase / rclone / скрипты.
2. `restore_db_from_yandex.sh` + `restore_storage_from_yandex.sh` (или full).
3. `install_backup_cron.sh`, проверить алерты.

```
pb_data/
  data.db
  auxiliary.db   # опционально
  storage/
```

## RPO

- Бизнес-данные: до ~15 минут (тик бэкапа :03/:18/…).
- Файлы в `storage/`: до ~1 суток.
- Full: до 14 дней на Диске.

## Важно

- Не копируйте вручную только `data.db` без `.backup`.
- При «пустых» users в Admin сначала смотрите journal на `disk I/O` и рестарт/watchdog — данные могли не удалиться.
- Логи: `tail -f /var/log/tennis-backup-db.log` / `tennis-pb-watchdog.log`
