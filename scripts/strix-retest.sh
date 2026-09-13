#!/usr/bin/env bash
# Retest Strix fixes against live app. Run on VPS or machine with API access.
#
# Usage:
#   export USER_JWT='...'          # ordinary user (refreshable)
#   export MOD_JWT='...'           # moderator (impersonate OK)
#   export BASE_URL='https://app.milenkih-team.ru'  # optional
#   bash /opt/tennis/scripts/strix-retest.sh
#
# Does not print full JWTs. Avoids destructive cancel of trainings.
set -euo pipefail

BASE="${BASE_URL:-https://app.milenkih-team.ru}"
USER_JWT="${USER_JWT:?set USER_JWT}"
MOD_JWT="${MOD_JWT:?set MOD_JWT}"

pass=0
fail=0
skip=0

ok() { echo "PASS  $1"; pass=$((pass + 1)); }
bad() { echo "FAIL  $1 — $2"; fail=$((fail + 1)); }
skp() { echo "SKIP  $1 — $2"; skip=$((skip + 1)); }

# status_body METHOD URL [auth_jwt] [json_body]
status_body() {
  local method="$1" url="$2" auth="${3:-}" body="${4:-}"
  local args=(-sS -o /tmp/strix_retest_body.txt -w '%{http_code}' -X "$method" "$url")
  if [[ -n "$auth" ]]; then
    args+=(-H "Authorization: $auth")
  fi
  if [[ -n "$body" ]]; then
    args+=(-H 'Content-Type: application/json' -d "$body")
  fi
  curl "${args[@]}"
}

expect_status() {
  local label="$1" want="$2" got="$3" extra="${4:-}"
  if [[ "$got" == "$want" ]]; then
    ok "$label ($got)"
  else
    local snip
    snip="$(head -c 160 /tmp/strix_retest_body.txt 2>/dev/null | tr '\n' ' ' || true)"
    bad "$label" "want $want got $got $extra $snip"
  fi
}

echo "=== identities ==="
USER_REFRESHABLE=0
code="$(status_body POST "$BASE/api/collections/users/auth-refresh" "$USER_JWT")"
if [[ "$code" == "200" ]]; then
  USER_JWT="$(python3 -c 'import json;print(json.load(open("/tmp/strix_retest_body.txt"))["token"])')"
  USER_ID="$(python3 -c 'import json;print(json.load(open("/tmp/strix_retest_body.txt"))["record"]["id"])')"
  USER_ROLE="$(python3 -c 'import json;print(json.load(open("/tmp/strix_retest_body.txt"))["record"].get("role",""))')"
  USER_REFRESHABLE=1
  echo "USER id=$USER_ID role=$USER_ROLE (refreshable)"
else
  # Impersonate / non-refreshable: decode id, fetch role
  USER_ID="$(USER_JWT="$USER_JWT" python3 - <<'PY'
import os, base64, json
p = os.environ["USER_JWT"].split(".")[1]
p += "=" * ((4 - len(p) % 4) % 4)
print(json.loads(base64.urlsafe_b64decode(p))["id"])
PY
)"
  code="$(status_body GET "$BASE/api/collections/users/records/${USER_ID}?fields=id,role" "$USER_JWT")"
  if [[ "$code" != "200" ]]; then
    echo "USER_JWT invalid ($code). Get a fresh token and retry."
    head -c 200 /tmp/strix_retest_body.txt; echo
    exit 1
  fi
  USER_ROLE="$(python3 -c 'import json;print(json.load(open("/tmp/strix_retest_body.txt")).get("role",""))')"
  echo "USER id=$USER_ID role=$USER_ROLE (impersonate/non-refreshable — skip refresh/logout)"
fi

# resolve MOD id from JWT payload without verify
MOD_ID="$(MOD_JWT="$MOD_JWT" python3 - <<'PY'
import os, base64, json
p = os.environ["MOD_JWT"].split(".")[1]
p += "=" * ((4 - len(p) % 4) % 4)
print(json.loads(base64.urlsafe_b64decode(p))["id"])
PY
)"
code="$(status_body GET "$BASE/api/collections/users/records/${MOD_ID}?fields=id,role" "$MOD_JWT")"
if [[ "$code" == "200" ]]; then
  MOD_ROLE="$(python3 -c 'import json;print(json.load(open("/tmp/strix_retest_body.txt")).get("role",""))')"
else
  code="$(status_body GET "$BASE/api/collections/users/records/${MOD_ID}?fields=id,role" "$USER_JWT")"
  MOD_ROLE="$(python3 -c 'import json;print(json.load(open("/tmp/strix_retest_body.txt")).get("role",""))' 2>/dev/null || echo '?')"
fi
echo "MOD  id=$MOD_ID role=$MOD_ROLE"
[[ "$USER_ROLE" == "user" || "$USER_ROLE" == "participant" ]] || echo "WARN: USER role is '$USER_ROLE' (expected ordinary user)"
[[ "$MOD_ROLE" == "moderator" ]] || echo "WARN: MOD role is '$MOD_ROLE' (expected moderator)"

echo "=== CORS ==="
evil="$(curl -sS -o /dev/null -D - -X OPTIONS "$BASE/api/collections/users/records" \
  -H 'Origin: https://evil.example' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: Authorization' | tr -d '\r')"
acao_evil="$(echo "$evil" | awk -F': ' 'tolower($1)=="access-control-allow-origin"{print $2; exit}')"
if [[ -z "$acao_evil" || "$acao_evil" == "null" ]]; then
  ok "CORS evil has no ACAO"
elif [[ "$acao_evil" == "*" || "$acao_evil" == "https://evil.example" ]]; then
  bad "CORS evil" "ACAO=$acao_evil"
else
  ok "CORS evil ACAO=$acao_evil (not * / evil)"
fi
apph="$(curl -sS -o /dev/null -D - -X OPTIONS "$BASE/api/collections/users/records" \
  -H 'Origin: https://app.milenkih-team.ru' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: Authorization' | tr -d '\r')"
acao_app="$(echo "$apph" | awk -F': ' 'tolower($1)=="access-control-allow-origin"{print $2; exit}')"
if [[ "$acao_app" == "https://app.milenkih-team.ru" ]]; then
  ok "CORS app ACAO=$acao_app"
else
  bad "CORS app" "ACAO=$acao_app"
fi

echo "=== HIGH media ==="
code="$(status_body GET "$BASE/api/video-poster?collection=posts&recordId=x&filename=y.webp")"
expect_status "video-poster anon" "401" "$code"

code="$(status_body GET "$BASE/api/video-poster?collection=posts&recordId=x&filename=y.webp" "$USER_JWT")"
# auth OK → missing record → 404 (or 400 missing resolved)
if [[ "$code" == "404" || "$code" == "400" ]]; then
  ok "video-poster auth reaches handler ($code)"
elif [[ "$code" == "401" ]]; then
  # try query token
  code="$(status_body GET "$BASE/api/video-poster?collection=posts&recordId=x&filename=y.webp&token=${USER_JWT}")"
  if [[ "$code" == "404" || "$code" == "400" ]]; then
    ok "video-poster ?token= reaches handler ($code)"
  else
    bad "video-poster auth" "got $code"
  fi
else
  bad "video-poster auth" "got $code"
fi

FILE_URL=""
posts="$(status_body GET "$BASE/api/collections/posts/records?perPage=30&fields=id,collectionId,media" "$USER_JWT")"
if [[ "$posts" == "200" ]]; then
  FILE_URL="$(python3 - <<'PY'
import json
d=json.load(open("/tmp/strix_retest_body.txt"))
for p in d.get("items") or []:
  media=p.get("media") or []
  if isinstance(media,str): media=[media]
  if media:
    cid=p.get("collectionId") or "posts"
    print(f"{cid}/{p['id']}/{media[0]}")
    break
PY
)"
fi
if [[ -z "$FILE_URL" ]]; then
  g="$(status_body GET "$BASE/api/collections/gallery/records?perPage=20&fields=id,collectionId,image,video" "$USER_JWT")"
  if [[ "$g" == "200" ]]; then
    FILE_URL="$(python3 - <<'PY'
import json
d=json.load(open("/tmp/strix_retest_body.txt"))
for p in d.get("items") or []:
  fn=p.get("image") or p.get("video")
  if fn:
    cid=p.get("collectionId") or "gallery"
    print(f"{cid}/{p['id']}/{fn}")
    break
PY
)"
  fi
fi
if [[ -z "$FILE_URL" ]]; then
  u="$(status_body GET "$BASE/api/collections/users/records/${USER_ID}?fields=id,collectionId,avatar" "$USER_JWT")"
  if [[ "$u" == "200" ]]; then
    FILE_URL="$(python3 - <<'PY'
import json
d=json.load(open("/tmp/strix_retest_body.txt"))
if d.get("avatar"):
  cid=d.get("collectionId") or "_pb_users_auth_"
  print(f"{cid}/{d['id']}/{d['avatar']}")
PY
)"
  fi
fi

if [[ -n "$FILE_URL" ]]; then
  echo "file=$FILE_URL"
  code="$(curl -sS -o /tmp/strix_retest_body.txt -w '%{http_code}' -I "$BASE/api/files/$FILE_URL")"
  if [[ "$code" == "403" || "$code" == "401" || "$code" == "404" ]]; then
    ok "files anon blocked ($code)"
  else
    bad "files anon" "want 401/403/404 got $code"
  fi
  # auth via file token endpoint
  ft="$(status_body POST "$BASE/api/files/token" "$USER_JWT")"
  if [[ "$ft" == "200" ]]; then
    FTOKEN="$(python3 -c 'import json;print(json.load(open("/tmp/strix_retest_body.txt")).get("token",""))')"
    code="$(curl -sS -o /tmp/strix_retest_body.txt -w '%{http_code}' -I "$BASE/api/files/$FILE_URL?token=$FTOKEN")"
    if [[ "$code" == "200" ]]; then
      ok "files with file-token ($code)"
    else
      bad "files with file-token" "got $code"
    fi
  else
    skp "files with file-token" "POST /api/files/token → $ft"
  fi
else
  skp "files protected" "no media/avatar found for user"
fi

echo "=== content_views ==="
code="$(status_body POST "$BASE/api/collections/content_views/records" "$USER_JWT" \
  "{\"object_type\":\"post\",\"object_id\":\"test123456789ab\",\"user\":\"$USER_ID\"}")"
expect_status "content_views collection create blocked" "403" "$code"

code="$(status_body POST "$BASE/api/content-view" "$USER_JWT" \
  '{"object_type":"evil","object_id":"test123456789ab"}')"
expect_status "content-view evil type" "400" "$code"

POST_ID="$(python3 - <<'PY'
import json
try:
  d=json.load(open("/tmp/strix_posts.json"))
except Exception:
  d={}
print((d.get("items") or [{}])[0].get("id",""))
PY
)"
status_body GET "$BASE/api/collections/posts/records?perPage=1&fields=id" "$USER_JWT" >/dev/null
cp /tmp/strix_retest_body.txt /tmp/strix_posts.json
POST_ID="$(python3 -c 'import json;d=json.load(open("/tmp/strix_posts.json"));print((d.get("items") or [{}])[0].get("id",""))')"
if [[ -n "$POST_ID" ]]; then
  code="$(status_body POST "$BASE/api/content-view" "$USER_JWT" \
    "{\"object_type\":\"post\",\"object_id\":\"$POST_ID\"}")"
  expect_status "content-view valid" "200" "$code"
else
  skp "content-view valid" "no posts"
fi

echo "=== bot-notify-training ==="
# user + чужой userId + spoof actorIsModerator → 403 (роль только из auth)
code="$(status_body POST "$BASE/api/bot-notify-training" "$USER_JWT" \
  "{\"event\":\"book\",\"trainingId\":\"dummyid1234567\",\"userIds\":[\"$MOD_ID\"],\"actorId\":\"$USER_ID\",\"totalBookedCount\":1,\"actorIsModerator\":true}")"
expect_status "user spoof moderator notify" "403" "$code"

# mod + валидные поля + несуществующая тренировка → 404 (роль пройдена)
code="$(status_body POST "$BASE/api/bot-notify-training" "$MOD_JWT" \
  "{\"event\":\"book\",\"trainingId\":\"dummyid1234567\",\"userIds\":[\"$USER_ID\"],\"actorId\":\"$MOD_ID\",\"totalBookedCount\":1}")"
if [[ "$code" == "404" || "$code" == "200" ]]; then
  ok "mod notify reaches handler ($code)"
elif [[ "$code" == "403" ]]; then
  bad "mod notify" "403 — mod JWT not accepted as moderator?"
else
  bad "mod notify" "got $code"
fi

echo "=== trainings ==="
status_body GET "$BASE/api/collections/trainings/records?perPage=10&sort=-date&fields=id,is_cancelled,booked_users" "$USER_JWT" >/dev/null
TRAINING_ID="$(python3 - <<'PY'
import json
d=json.load(open("/tmp/strix_retest_body.txt"))
for t in d.get("items") or []:
  if not t.get("is_cancelled"):
    print(t["id"]); break
PY
)"
if [[ -z "$TRAINING_ID" ]]; then
  skp "trainings ACL" "no open trainings visible to user"
else
  echo "training=$TRAINING_ID"
  code="$(status_body PATCH "$BASE/api/collections/trainings/records/$TRAINING_ID" "$USER_JWT" \
    "{\"moderator_kicked_users\":[\"$MOD_ID\"]}")"
  expect_status "user kick foreign" "403" "$code"
  code="$(status_body PATCH "$BASE/api/collections/trainings/records/$TRAINING_ID" "$USER_JWT" \
    '{"is_cancelled":true}')"
  expect_status "user cancel training" "403" "$code"
  # self-book: only set booked_users to [self] if empty-ish — use + relation if API supports; skip if risky
  skp "user self book" "do manually in app (avoid clobbering booked_users via raw PATCH)"
fi

echo "=== notifications ==="
status_body GET "$BASE/api/collections/notifications/records?perPage=1&filter=recipient%3D%27${USER_ID}%27&fields=id,recipient,is_read" "$USER_JWT" >/dev/null
NID="$(python3 -c 'import json;d=json.load(open("/tmp/strix_retest_body.txt"));print((d.get("items") or [{}])[0].get("id",""))')"
if [[ -z "$NID" ]]; then
  skp "notifications" "no notifications for user"
else
  code="$(status_body PATCH "$BASE/api/collections/notifications/records/$NID" "$USER_JWT" \
    "{\"recipient\":\"$MOD_ID\"}")"
  if [[ "$code" == "400" || "$code" == "403" ]]; then
    ok "notif reassign blocked ($code)"
  else
    bad "notif reassign" "want 400/403 got $code"
  fi
  code="$(status_body PATCH "$BASE/api/collections/notifications/records/$NID" "$USER_JWT" \
    '{"is_read":true}')"
  expect_status "notif mark read" "200" "$code"
fi

echo "=== refresh invalidate + logout ==="
if [[ "$USER_REFRESHABLE" != "1" ]]; then
  skp "refresh/logout" "USER_JWT is impersonate (refreshable=false) — нужен обычный session JWT"
else
  code="$(status_body POST "$BASE/api/collections/users/auth-refresh" "$USER_JWT")"
  expect_status "auth-refresh #1" "200" "$code"
  TOK_A="$(python3 -c 'import json;print(json.load(open("/tmp/strix_retest_body.txt"))["token"])')"
  code="$(status_body POST "$BASE/api/collections/users/auth-refresh" "$TOK_A")"
  expect_status "auth-refresh #2" "200" "$code"
  TOK_B="$(python3 -c 'import json;print(json.load(open("/tmp/strix_retest_body.txt"))["token"])')"
  code="$(status_body GET "$BASE/api/collections/users/records/${USER_ID}?fields=id" "$TOK_A")"
  if [[ "$code" == "401" || "$code" == "403" ]]; then
    ok "previous token dead after refresh ($code)"
  else
    bad "previous token after refresh" "want 401/403 got $code"
  fi
  code="$(status_body GET "$BASE/api/collections/users/records/${USER_ID}?fields=id" "$TOK_B")"
  expect_status "current token alive" "200" "$code"
  code="$(status_body POST "$BASE/api/logout" "$TOK_B")"
  expect_status "logout" "200" "$code"
  code="$(status_body GET "$BASE/api/collections/users/records/${USER_ID}?fields=id" "$TOK_B")"
  if [[ "$code" == "401" || "$code" == "403" ]]; then
    ok "token dead after logout ($code)"
  else
    bad "token after logout" "want 401/403 got $code"
  fi
fi

echo
echo "RESULT pass=$pass fail=$fail skip=$skip"
[[ "$fail" -eq 0 ]]
