# Retest checklist — Strix fixes

После деплоя hooks + schema apply ([ops-strix-schema-apply.md](ops-strix-schema-apply.md)) + ротации токена ([ops-max-bot-token.md](ops-max-bot-token.md)):

## CRITICAL
- [ ] Старый `MAX_BOT_TOKEN` отвергается Bot API
- [ ] `grep -R MAX_BOT_TOKEN client/` — нет живых значений в tracked/local client env
- [ ] Бот-уведомления и `/api/max-auth` работают с новым токеном

## HIGH — media
- [ ] `curl -I` без auth на `/api/files/posts/<id>/<file>` → 403/404
- [ ] `curl` без auth на `/api/video-poster?...` → 401
- [ ] В приложении (залогинен): лента, gallery, avatars, video posters грузятся
- [ ] `curl` с `Authorization` или `?token=` (auth JWT) на video-poster → 200

## MEDIUM — bot-notify
- [ ] User token + body `actorIsModerator:true` + чужой userId → 403
- [ ] User self book → 200, текст без «Модератор»
- [ ] Moderator book другого → 200, текст «Модератор…»

## MEDIUM — trainings
- [ ] User PATCH `moderator_kicked_users` чужой id → 403
- [ ] User PATCH `is_cancelled:true` → 403
- [ ] User book/unbook себя → 200
- [ ] Mod kick/restore → 200

## MEDIUM — content_views
- [ ] `POST /api/collections/content_views/records` от user → 403
- [ ] `POST /api/content-view` валидный → 200
- [ ] `POST /api/content-view` с `object_type=evil` → 400

## LOW — CORS / logout / notifications
- [ ] OPTIONS с `Origin: https://evil.example` — нет `ACAO: *` (или не отражает evil)
- [ ] `POST /api/logout` → старый JWT больше не проходит на API
- [ ] auth-refresh → предыдущий access token мёртв
- [ ] User PATCH notification `{ recipient: otherId }` → 400/403; `{ is_read: true }` → 200

PoC-файлы: `strix_runs/app-milenkih-team-ru_cab8/vulnerabilities/vuln-000N.md`
