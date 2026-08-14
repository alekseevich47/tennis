#!/usr/bin/env bash
# Обновление продакшена: git pull deploy_prod → сборка клиента → рестарт PocketBase.
# Запуск на сервере: sudo /opt/tennis/scripts/deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/tennis}"
BRANCH="${DEPLOY_BRANCH:-deploy_prod}"

cd "$APP_DIR"

if [[ "$(git rev-parse --abbrev-ref HEAD)" != "$BRANCH" ]]; then
  echo "Ожидается ветка $BRANCH, сейчас: $(git rev-parse --abbrev-ref HEAD)"
  exit 1
fi

git fetch origin "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [[ ! -f "$APP_DIR/client/.env" ]]; then
  echo "Нет $APP_DIR/client/.env — скопируйте config/env.prod.example"
  exit 1
fi

cd "$APP_DIR/client"
npm ci
npx vite build --base /

systemctl restart pocketbase
systemctl --no-pager --full status pocketbase | head -n 20

echo "OK: $(git rev-parse --short HEAD) → https://app.milenkih-team.ru/"
