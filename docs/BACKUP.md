# Бэкапы и восстановление PocketBase

Трёхслойная схема → облака через `rclone` (**Yandex** + **VK / Mail Cloud**).

**Политика upload:** успех = **≥1 remote OK**; если один или оба FAIL — **MAX ops-алерт** (`ops_alert_max.sh` → `OPS_ALERT_MAX_IDS`).

**Меню на сервере:**

```bash
sudo bash /opt/tennis/scripts/tennis_backup.sh
```

- Создание бэкапа → Yandex / VK / оба → DB / STORAGE / FULL  
- Загрузка бэкапа → Yandex / VK → тип → выбор снимка  
- Просмотр архива → Yandex / VK / оба → список + 5 последних  

## Скрипты

| Слой | Скрипт | Cron | Path |
|------|--------|------|------|
| **DB** | `backup_db.sh` | `:03/:18/:33/:48` | `…/db/` |
| **STORAGE** | `backup_storage.sh` | 00:00 МСК | `…/storage/` (зеркало) |
| **FULL** | `backup_full.sh` | вс 00:00 МСК | `…/full/backup_*/` |
| Restore | `restore_db.sh` / `restore_storage.sh` / `restore_full.sh` | — | интерактив или `RESTORE_SELECTED` |
| Меню | `tennis_backup.sh` | — | UI |
| Watchdog | `pocketbase_io_watchdog.sh` | `*/5` | — |

Старые имена `*_yandex.sh` удалены. После деплоя: `sudo bash install_backup_cron.sh` (маркер `tennis-backup-v3`).

### БД — только SQLite Online Backup API

`sqlite3 data.db ".backup '…'"` — не `zip`/`cp` живого `data.db` / `-wal` / `-shm`.

---

## Mail Cloud / VK (rclone)

В меню подпись **VK** (синий) = remote Mail Cloud (`mailru` или `CLOUD_VK`).

1. Пароль приложения Mail.ru (полный доступ к почте/облаку/календарю).
2. `sudo rclone config` → name `mailru`, type `mailru`.
3. `sudo rclone mkdir mailru:tennis_backup`
4. Конфиг:

```bash
sudo cp /opt/tennis/config/backup_remotes.env.example /etc/tennis/backup_remotes.env
# CLOUD_YANDEX=yandex:tennis_backup
# CLOUD_VK=mailru:tennis_backup
# REMOTE_ROOTS=yandex:tennis_backup,mailru:tennis_backup
```

5. Проверка: `sudo bash /opt/tennis/scripts/backup_db.sh --force`

## Установка

```bash
sudo apt-get install -y sqlite3 zip unzip gzip curl python3
sudo chmod +x /opt/tennis/scripts/*.sh
sudo /opt/tennis/scripts/install_backup_cron.sh
```

Алерты: `config/ops_alert_recipients.env` (`OPS_ALERT_MAX_IDS`).

## Ручной запуск (без меню)

```bash
sudo /opt/tennis/scripts/backup_db.sh --force
sudo /opt/tennis/scripts/backup_storage.sh --force
sudo /opt/tennis/scripts/backup_full.sh --force

sudo REMOTE_ROOT=mailru:tennis_backup bash /opt/tennis/scripts/restore_db.sh
```

Админка: «Бэкап БД» / «Бэкап медиа» → `admin_backup_runner.sh` → in-app колокольчик; partial remote FAIL → ещё MAX ops-алерт.

## RPO

- DB: ~15 мин · STORAGE: ~1 сутки · FULL: до 14 дней в облаке

## Важно

- Перед `deploy.sh` при local changes: `git restore scripts/`
- Логи cron: `/var/log/tennis-backup-*.log`; ручные: `/opt/tennis/backups/logs/manual-*.log`
