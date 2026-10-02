#!/usr/bin/env bash
# Регистрация webhook Telegram-бота и кнопки Menu → Mini App.
# Секреты — только из env (не в argv/`ps`): TG_BOT_TOKEN, TG_BOT_WEBHOOK_SECRET, TG_WEBAPP_URL.
#
# Пример:
#   export TG_BOT_TOKEN=...
#   export TG_BOT_WEBHOOK_SECRET=$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9_-' | head -c 40)
#   export TG_WEBAPP_URL=https://app.milenkih-team.ru/
#   ./scripts/tg_bot_setup.sh
#
# После успеха: прописать те же значения в systemd override PocketBase и restart.
set -euo pipefail

: "${TG_BOT_TOKEN:?TG_BOT_TOKEN required}"
: "${TG_BOT_WEBHOOK_SECRET:?TG_BOT_WEBHOOK_SECRET required (A-Za-z0-9_-, 32+ chars)}"
: "${TG_WEBAPP_URL:?TG_WEBAPP_URL required (https Mini App URL)}"

WEBHOOK_URL="${TG_BOT_WEBHOOK_URL:-https://app.milenkih-team.ru/api/tg-bot-webhook}"

if ! [[ "$TG_BOT_WEBHOOK_SECRET" =~ ^[A-Za-z0-9_-]{32,256}$ ]]; then
  echo "[tg-setup] TG_BOT_WEBHOOK_SECRET must match [A-Za-z0-9_-]{32,256}" >&2
  exit 1
fi
# URL без кавычек/пробелов/бэкслешей — иначе JSON через printf небезопасен.
if ! [[ "$TG_WEBAPP_URL" =~ ^https://[^\"\\[:space:]]+$ ]]; then
  echo "[tg-setup] TG_WEBAPP_URL must be https://… without quotes/spaces/backslashes" >&2
  exit 1
fi
if ! [[ "$WEBHOOK_URL" =~ ^https://[^\"\\[:space:]]+$ ]]; then
  echo "[tg-setup] TG_BOT_WEBHOOK_URL must be https://… without quotes/spaces/backslashes" >&2
  exit 1
fi

CFG="$(mktemp)"
chmod 600 "$CFG"
trap 'rm -f "$CFG"' EXIT

# Токен только в tmp-конфиге curl (не argv/`ps`). Тело — JSON через stdin.
tg_api_json() {
  local method="$1"
  local json="$2"
  printf 'url = "https://api.telegram.org/bot%s/%s"\n' "$TG_BOT_TOKEN" "$method" >"$CFG"
  printf '%s\n' "$json" | curl -sS --fail -K "$CFG" \
    -H 'Content-Type: application/json' \
    --data-binary @-
}

echo "[tg-setup] setWebhook → $WEBHOOK_URL"
tg_api_json setWebhook "$(printf \
  '{"url":"%s","secret_token":"%s","allowed_updates":["message","my_chat_member"],"drop_pending_updates":true}' \
  "$WEBHOOK_URL" "$TG_BOT_WEBHOOK_SECRET")"
echo

echo "[tg-setup] setChatMenuButton (web_app)"
tg_api_json setChatMenuButton "$(printf \
  '{"menu_button":{"type":"web_app","text":"Открыть","web_app":{"url":"%s"}}}' \
  "$TG_WEBAPP_URL")"
echo

echo "[tg-setup] getWebhookInfo"
tg_api_json getWebhookInfo '{}'
echo
echo "[tg-setup] OK. Добавьте в pocketbase.service.d/override.conf:"
echo "  Environment=TG_BOT_TOKEN=…"
echo "  Environment=TG_BOT_WEBHOOK_SECRET=…  (тот же, что использовали при setWebhook)"
echo "  Environment=TG_WEBAPP_URL=${TG_WEBAPP_URL}"
echo "затем: systemctl daemon-reload && systemctl restart pocketbase"
