# Бэкапы и восстановление PocketBase

Трёхслойная схема: частая БД, суточное медиа, недельный полный архив → облака через `rclone`.

**Remotes:** по умолчанию `yandex:tennis_backup`. Можно зеркалировать на несколько (Yandex + Mail Cloud): успех = **≥1 remote OK**; если один или оба FAIL — **MAX ops-алерт** (`ops_alert_max.sh` → `OPS_ALERT_MAX_IDS`).

## Слои

| Слой | Скрипт | Расписание | Remote path | Условие |
|------|--------|------------|-------------|---------|
| **DB** | `backup_db_to_yandex.sh` | **:03/:18/:33/:48** каждого часа | `…/db/` | только если менялись `data.db` / `-wal` (или `--force`) |
| **MEDIA** | `backup_storage_to_yandex.sh` | 00:00 МСК (21:00 UTC) | `…/storage/` | только если есть файлы новее последнего успешного sync (или `--force`) |
| **FULL** | `backup_to_yandex.sh` | вс 00:00 МСК | `…/full/backup_*/` | всегда |
| **Watchdog** | `pocketbase_io_watchdog.sh` | каждые 5 мин | — | при `disk I/O error` → restart PB + MAX-алерт |

Расписание DB сдвинуто на +3 мин относительно `membership_lifecycle` (`*/15`), чтобы не бить в один тик по SQLite.

### БД только через SQLite Online Backup API

Канонический способ: `sqlite3 data.db ".backup '…'"` (`backup_common.sh` → `sqlite_backup_file`).

**Запрещено:** `zip`/`cp` живого `data.db`, копирование `data.db-wal` / `data.db-shm`. Иначе снимок может быть битым.

Ручные кнопки в админ-панели приложения всегда вызывают скрипты с `--force`.

---

## Подключение Mail Cloud (по шагам)

### 1. Аккаунт Mail.ru

1. Заведите отдельный ящик под бэкапы (желательно без лишней 2FA на сервисном аккаунте, либо с рабочим «паролем приложения»).
2. Откройте [Облако Mail](https://cloud.mail.ru/) под этим аккаунтом, примите соглашения.
3. **Пароль и безопасность** → **Пароли для внешних приложений** → создать пароль.
4. Права: **полный доступ к Почте, Облаку и Календарю** (не только WebDAV) — иначе rclone `mailru` часто не авторизуется.

Лимит бесплатного аккаунта: файл до ~2 GB; FULL у нас режется на части 15 MB — это ок.

### 2. Remote rclone на VPS (от root)

```bash
sudo rclone config
```

- name: `mailru`
- storage: `mailru` (нативный backend, не WebDAV)
- user: `you@mail.ru`
- pass: пароль внешнего приложения

Проверка:

```bash
sudo rclone lsd mailru:
sudo rclone mkdir mailru:tennis_backup
sudo rclone lsd mailru:tennis_backup
```

Remote `yandex` уже должен работать (`rclone lsd yandex:tennis_backup`).

### 3. Включить зеркалирование в конфиге

```bash
sudo mkdir -p /etc/tennis
sudo cp /opt/tennis/config/backup_remotes.env.example /etc/tennis/backup_remotes.env
# убедиться, что строка такая:
# REMOTE_ROOTS=yandex:tennis_backup,mailru:tennis_backup
sudo nano /etc/tennis/backup_remotes.env
```

Скрипты читают `/etc/tennis/backup_remotes.env` (или `config/backup_remotes.env` в репо).

### 4. Деплой скриптов (если ещё не на сервере)

```bash
cd /opt/tennis
git restore scripts/ 2>/dev/null || true
sudo bash ./scripts/deploy.sh
# при необходимости:
sudo bash ./scripts/install_backup_cron.sh
```

### 5. Проверка

```bash
# dry-run (снимок локально не льёт, но покажет remotes)
sudo bash /opt/tennis/scripts/backup_db_to_yandex.sh --force --dry-run

# реальный DB-бэкап на оба remote
sudo bash /opt/tennis/scripts/backup_db_to_yandex.sh --force

sudo rclone lsf yandex:tennis_backup/db/ | tail
sudo rclone lsf mailru:tennis_backup/db/ | tail
```

Алерт (если один remote недоступен) уходит в MAX на `OPS_ALERT_MAX_IDS` — те же, что watchdog. Проверка бота:

```bash
sudo bash /opt/tennis/scripts/ops_alert_max.sh "tennis backup remotes test"
```

Имитация partial: временно переименуйте remote в rclone config и снова `--force` — должен быть алерт «partial — OK: …; FAIL: …», exit 0 если второй remote жив.

### 6. Restore с Mail Cloud

По умолчанию restore смотрит primary (`первый` в `REMOTE_ROOTS`, обычно Yandex). С Mail:

```bash
sudo REMOTE_ROOT=mailru:tennis_backup bash /opt/tennis/scripts/restore_db_from_yandex.sh
sudo REMOTE_ROOT=mailru:tennis_backup bash /opt/tennis/scripts/restore_storage_from_yandex.sh
sudo REMOTE_ROOT=mailru:tennis_backup bash /opt/tennis/scripts/restore_from_yandex.sh
```

---

## Установка на сервере (база)

```bash
sudo apt-get install -y sqlite3 zip unzip gzip curl python3
# rclone + remotes yandex (и при необходимости mailru) для root

sudo chmod +x /opt/tennis/scripts/*.sh
sudo /opt/tennis/scripts/install_backup_cron.sh
```

`install_backup_cron.sh` ставит:

1. crontab (root): DB / MEDIA / FULL + watchdog
2. sudoers: `pocketbase` → DB/MEDIA скрипты (кнопки админки)
3. `/etc/tennis/ops_alert.env` (шаблон) — при необходимости `MAX_BOT_TOKEN=…` (иначе берётся из Environment unit `pocketbase`)

Получатели алертов: [`config/ops_alert_recipients.env`](../config/ops_alert_recipients.env) (`OPS_ALERT_MAX_IDS`).

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

После завершения ручного бэкапа всем `role=moderator` уходит in-app уведомление в колокольчик от **«Секция Миленьких - Система»** (успех или ошибка скрипта в целом). Цепочка: `POST /api/admin-backup` → `admin_backup_runner.sh` → `POST /api/internal/backup-notify`. Лог: `/opt/tennis/backups/logs/manual-{db|media}.log`. Partial remote FAIL при этом дополнительно шлёт MAX ops-алерт.

## Восстановление

### Только БД

```bash
sudo /opt/tennis/scripts/restore_db_from_yandex.sh
# или: sudo REMOTE_ROOT=mailru:tennis_backup bash …/restore_db_from_yandex.sh
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

1. Bootstrap / PocketBase / rclone remotes / скрипты.
2. `restore_db_from_yandex.sh` + `restore_storage_from_yandex.sh` (или full).
3. `install_backup_cron.sh`, `backup_remotes.env`, проверить алерты.

## RPO

- Бизнес-данные: до ~15 минут (тик бэкапа :03/:18/…).
- Файлы в `storage/`: до ~1 суток.
- Full: до 14 дней в облаке.

## Важно

- Не копируйте вручную только `data.db` без `.backup`.
- При «пустых» users в Admin сначала смотрите journal на `disk I/O` и рестарт/watchdog.
- Логи: `tail -f /var/log/tennis-backup-db.log` / `tennis-pb-watchdog.log`
- Перед `deploy.sh` при local changes: `git restore scripts/`
