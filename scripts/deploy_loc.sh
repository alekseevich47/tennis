#!/usr/bin/env bash
# Локальный promote: test-deploy-cursor → deploy_prod → push на origin.
# Запуск из корня репозитория: ./scripts/deploy_loc.sh
#
# Порядок:
#   1. checkout deploy_prod
#   2. pull --ff-only   (подтянуть удалённый deploy_prod)
#   3. merge test-deploy-cursor
#   4. push origin deploy_prod
#
# НЕ push до merge и НЕ pull после merge — иначе remote не участвует в merge
# или вы затираете только что сделанный merge.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_BRANCH="${SOURCE_BRANCH:-test-deploy-cursor}"
TARGET_BRANCH="${TARGET_BRANCH:-deploy_prod}"

cd "$ROOT"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Рабочая копия не чистая — закоммитьте или stash перед deploy."
  exit 1
fi

git fetch origin "$SOURCE_BRANCH" "$TARGET_BRANCH"

git checkout "$TARGET_BRANCH"
git pull --ff-only origin "$TARGET_BRANCH"

git merge "$SOURCE_BRANCH" --no-edit

git push origin "$TARGET_BRANCH"

echo "OK: $SOURCE_BRANCH → $TARGET_BRANCH ($(git rev-parse --short HEAD))"
