# Ops: ротация MAX_BOT_TOKEN (CRITICAL / Strix)

Токен бота нужен **только** серверу PocketBase (`pb_hooks/botlib.js`, `pb_hooks/max-auth.pb.js` через `$os.getenv('MAX_BOT_TOKEN')`). Клиент его не читает.

## Немедленно после утечки

1. В кабинете разработчика MAX отозвать старый токен и выпустить новый.
2. На сервере прописать новый токен в override (не в git):

```ini
# /etc/systemd/system/pocketbase.service.d/override.conf
[Service]
Environment=MAX_BOT_TOKEN=...новый...
```

3. `sudo systemctl daemon-reload && sudo systemctl restart pocketbase`
4. Проверить: бот-уведомления о записи на тренировку, `/api/max-auth`.
5. Убедиться, что старый токен отвергается Bot API.
6. Удалить `MAX_BOT_TOKEN=...` из любых локальных `client/.env` / бэкапов.

## Purge истории Git (вручную)

Значение могло остаться в истории даже после удаления из tree:

```bash
# пример: git filter-repo / BFG — destructive, требует force-push и ротации всех клонов
git filter-repo --invert-paths --path client/.env
# или поиск по содержимому токена и замена
```

После rewrite: force-push согласованно, переклонировать рабочие копии, ротировать CI secrets.

## Secret scanning

Рекомендуется gitleaks (или аналог) в CI, чтобы `MAX_BOT_TOKEN=` с непустым значением в tracked-файлах ломал сборку.

## Открытый follow-up (не finding)

После ротации: при необходимости захватить live MAX Bridge launch payload и проверить, что старый/новый токен не даёт session forgery (см. Strix report, attack chaining).
