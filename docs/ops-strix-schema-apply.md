# Применение schema / live PB после фиксов Strix

После деплоя кода нужно вручную на live PocketBase:

## 1. File fields → Protected

В Admin UI для полей:

- `users.avatar`
- `comments.media`
- `gallery.image`, `gallery.video`
- `posts.media`
- `products.images`
- `scheduled_broadcasts.media`
- `tournament_posts.media`
- `tournament_comments.media`

включить **Protected** (как в `schema.json`).

Без этого клиентские `?token=` не нужны серверу, и анонимный `/api/files/...` останется открытым.

## 2. `content_views`

- `createRule` = пусто / null (только `$app.save` из `/api/content-view`)
- `deleteRule` = `@request.auth.role = "moderator"` (опционально; для чистки)

## 3. `notifications`

`updateRule`:

```
recipient = @request.auth.id && (@request.body.recipient:isset = false || recipient = @request.body.recipient)
```

## 4. Сервис / nginx

- Обновить unit: `config/pocketbase.service` (`--origins=...`)
- `daemon-reload && restart pocketbase`
- Обновить nginx: `config/nginx-app.conf` (private cache для `/api/files/`) + reload

## 5. MAX_BOT_TOKEN

См. [ops-max-bot-token.md](ops-max-bot-token.md).
