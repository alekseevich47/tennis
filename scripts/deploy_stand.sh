#!/usr/bin/env bash
# Выкат тестового стенда tennis.loomixx.ru:
#   git reset origin/test → сборка клиента (base /) → /var/www/tennis → restart pocketbase-tennis
#
# Запуск на app: sudo /opt/tennis/scripts/deploy_stand.sh
#
# Нужны: Node/npm, client/.env со стендовыми VITE_* (tennis.loomixx.ru, тестовый MAX id).
# Не трогает nginx и не ставит cron бэкапов. Прод: deploy.sh / deploy_loc.sh.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/tennis}"
BRANCH="${DEPLOY_BRANCH:-test}"
STATIC_DIR="${STATIC_DIR:-/var/www/tennis}"
PB_SERVICE="${PB_SERVICE:-pocketbase-tennis}"

cd "$APP_DIR"

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

if [[ ! -f "$APP_DIR/client/.env" ]]; then
  echo "Нет $APP_DIR/client/.env — скопируйте config/env.prod.example и подставьте URL стенда"
  exit 1
fi

mkdir -p "$STATIC_DIR"

cd "$APP_DIR/client"
export VITE_APP_VERSION="$(git -C "$APP_DIR" rev-parse --short HEAD)"
npm ci
npx vite build --base /

rsync -a --delete dist/ "${STATIC_DIR}/"

systemctl restart "$PB_SERVICE"
systemctl --no-pager --full status "$PB_SERVICE" | head -n 20

echo "OK: $(git -C "$APP_DIR" rev-parse --short HEAD) → https://tennis.loomixx.ru/"
