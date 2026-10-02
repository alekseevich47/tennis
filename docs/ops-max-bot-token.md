# Ops: MAX_BOT_TOKEN + Telegram (TG_BOT_TOKEN / webhook)

Токены ботов нужны **только** серверу PocketBase (`pb_hooks/botlib.js`, `tgbotlib.js`, `max-auth.pb.js`, `tg-auth.pb.js` через `$os.getenv`). Клиент их не читает.

## Порядок деплоя Telegram (обязательно)

1. Импорт коллекции `users` из `schema.json` в live PocketBase (`tg_id`, `max_bot_blocked`, `tg_bot_blocked`, `tg_bot_blocked_at`, индекс `idx_users_tg_id`).
2. Deploy хуков + `systemctl restart pocketbase` (фильтры с `tg_id` иначе падают; есть fallback на `max_id`, но схема должна быть первой).
3. Env в systemd override: `TG_BOT_TOKEN`, `TG_BOT_WEBHOOK_SECRET`, `TG_WEBAPP_URL` (+ существующие MAX_*).
4. `sudo -E ./scripts/tg_bot_setup.sh` (setWebhook + Menu button).
5. BotFather: привязать домен Mini App (= `TG_WEBAPP_URL`).

## Env PocketBase (systemd override, не в git)

```ini
# /etc/systemd/system/pocketbase.service.d/override.conf
[Service]
Environment=MAX_BOT_TOKEN=…
Environment=MAX_BOT_WEBHOOK_SECRET=…
Environment=TG_BOT_TOKEN=…
Environment=TG_BOT_WEBHOOK_SECRET=…   # [A-Za-z0-9_-], ≥32 символа
Environment=TG_WEBAPP_URL=https://app.milenkih-team.ru/
Environment=PB_PUBLIC_URL=https://app.milenkih-team.ru
```

После правки: `sudo systemctl daemon-reload && sudo systemctl restart pocketbase`.

Проверка: `systemctl show pocketbase -p Environment` или `sudo tr '\0' '\n' < /proc/$PID/environ | grep -E 'MAX_BOT|TG_BOT|TG_WEB'`.

## Telegram: регистрация webhook

```bash
export TG_BOT_TOKEN=…
export TG_BOT_WEBHOOK_SECRET=$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9_-' | head -c 40)
export TG_WEBAPP_URL=https://app.milenkih-team.ru/
sudo -E ./scripts/tg_bot_setup.sh
```

Скрипт вызывает `setWebhook` (secret_token + `message`/`my_chat_member`) и `setChatMenuButton` (web_app). Токен — в tmp curl-конфиге 0600 (не в argv/`ps`); секрет в stdout не печатается.

В BotFather: привязать домен Mini App к боту (тот же URL, что `TG_WEBAPP_URL`).

Nginx: `location = /api/tg-bot-webhook` — allow-list IP Telegram + deny all; secret проверяет PB (fail-closed без `TG_BOT_WEBHOOK_SECRET`).

## Ротация MAX_BOT_TOKEN после утечки

1. В кабинете разработчика MAX отозвать старый токен и выпустить новый.
2. Прописать новый токен в override (см. выше).
3. `daemon-reload` + `restart pocketbase`.
4. Проверить: бот-уведомления о записи, `/api/max-auth`.
5. Убедиться, что старый токен отвергается Bot API.
6. Удалить `MAX_BOT_TOKEN=` из любых локальных `client/.env` / бэкапов.

## Ротация TG_BOT_TOKEN

1. BotFather → `/revoke` → новый токен.
2. Новый `TG_BOT_WEBHOOK_SECRET` + `tg_bot_setup.sh`.
3. Обновить override + restart PB.

## Purge истории Git (вручную)

Значение могло остаться в истории даже после удаления из tree:

```bash
# пример: git filter-repo / BFG — destructive, требует force-push и ротации всех клонов
git filter-repo --invert-paths --path client/.env
```

После rewrite: force-push согласованно, переклонировать рабочие копии, ротировать CI secrets.

## Secret scanning

Рекомендуется gitleaks (или аналог) в CI, чтобы `MAX_BOT_TOKEN=` / `TG_BOT_TOKEN=` с непустым значением в tracked-файлах ломал сборку.
