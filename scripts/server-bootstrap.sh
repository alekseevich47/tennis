#!/usr/bin/env bash
# Первичная установка на чистую Ubuntu. Секреты — только из окружения, не из git.
set -euo pipefail

: "${MAX_BOT_TOKEN:?}"
: "${MAX_BOT_WEBHOOK_SECRET:?}"

APP_DIR=/opt/tennis
PB_DIR=/opt/pocketbase
PB_VERSION=0.23.2
BRANCH=deploy_prod
DOMAIN=app.milenkih-team.ru
REPO_URL="${REPO_URL:-https://github.com/alekseevich47/tennis.git}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-loomixx.dev@ya.ru}"

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y --no-install-recommends \
  ca-certificates curl git unzip nginx apache2-utils ufw \
  certbot python3-certbot-nginx python3

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 18 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
fi

chmod +x "$APP_DIR/scripts/"*.sh

id pocketbase >/dev/null 2>&1 || useradd --system --home "$PB_DIR" --shell /usr/sbin/nologin pocketbase

mkdir -p "$PB_DIR" /var/www/certbot

if [[ ! -x "$PB_DIR/pocketbase" ]]; then
  tmp=$(mktemp -d)
  curl -fsSL -o "$tmp/pb.zip" \
    "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip"
  unzip -o "$tmp/pb.zip" -d "$PB_DIR"
  rm -rf "$tmp"
  chmod +x "$PB_DIR/pocketbase"
fi

mkdir -p "$PB_DIR/pb_data"
chown -R pocketbase:pocketbase "$PB_DIR"

CRED_FILE=/root/tennis-credentials.txt
if [[ ! -f "$CRED_FILE" ]]; then
  PB_ADMIN_EMAIL="admin@${DOMAIN}"
  PB_ADMIN_PASS=$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)
  NGINX_ADMIN_PASS=$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)
  umask 077
  cat > "$CRED_FILE" <<EOF
PocketBase superuser: ${PB_ADMIN_EMAIL}
PocketBase password:  ${PB_ADMIN_PASS}
Nginx /_/ login:      admin
Nginx /_/ password:   ${NGINX_ADMIN_PASS}
Admin UI:             https://${DOMAIN}/_/
EOF
else
  PB_ADMIN_EMAIL=$(awk -F': ' '/PocketBase superuser/{print $2}' "$CRED_FILE")
  PB_ADMIN_PASS=$(awk -F': ' '/PocketBase password/{print $2}' "$CRED_FILE")
  NGINX_ADMIN_PASS=$(awk -F': ' '/Nginx \/_\/ password/{print $2}' "$CRED_FILE")
fi

htpasswd -bc /etc/nginx/.htpasswd_pb_admin admin "$NGINX_ADMIN_PASS"
chown root:www-data /etc/nginx/.htpasswd_pb_admin
chmod 640 /etc/nginx/.htpasswd_pb_admin

install -m 644 "$APP_DIR/config/env.prod.example" "$APP_DIR/client/.env"

# Сначала без хуков: на пустой БД onBootstrap падает (нет коллекций).
install -m 644 "$APP_DIR/config/pocketbase.service" /etc/systemd/system/pocketbase.service
mkdir -p /etc/systemd/system/pocketbase.service.d
cat > /etc/systemd/system/pocketbase.service.d/override.conf <<EOF
[Service]
Environment=MAX_BOT_TOKEN=${MAX_BOT_TOKEN}
Environment=MAX_BOT_WEBHOOK_SECRET=${MAX_BOT_WEBHOOK_SECRET}
Environment=PB_PUBLIC_URL=https://${DOMAIN}
ExecStart=
ExecStart=/opt/pocketbase/pocketbase serve --http=127.0.0.1:8090 --dir=/opt/pocketbase/pb_data
EOF
chmod 600 /etc/systemd/system/pocketbase.service.d/override.conf

systemctl daemon-reload
systemctl enable pocketbase
systemctl restart pocketbase

wait_pb() {
  for i in $(seq 1 40); do
    if curl -sf http://127.0.0.1:8090/api/health >/dev/null; then
      return 0
    fi
    sleep 1
  done
  echo "PocketBase не поднялся"
  journalctl -u pocketbase -n 40 --no-pager || true
  return 1
}

wait_pb

systemctl stop pocketbase
sudo -u pocketbase "$PB_DIR/pocketbase" --dir="$PB_DIR/pb_data" superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASS"
systemctl start pocketbase
wait_pb

export PB_ADMIN_EMAIL PB_ADMIN_PASS
python3 - <<'PY'
import json, os, urllib.request

email = os.environ["PB_ADMIN_EMAIL"]
password = os.environ["PB_ADMIN_PASS"]
schema_path = "/opt/tennis/schema.json"

auth_body = json.dumps({"identity": email, "password": password}).encode()
req = urllib.request.Request(
    "http://127.0.0.1:8090/api/collections/_superusers/auth-with-password",
    data=auth_body,
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(req, timeout=30) as res:
    token = json.load(res)["token"]

schema = json.load(open(schema_path, encoding="utf-8"))
body = json.dumps({"collections": schema, "deleteMissing": False}).encode()
req = urllib.request.Request(
    "http://127.0.0.1:8090/api/collections/import",
    data=body,
    headers={"Authorization": token, "Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=120) as res:
        print("schema import:", res.status)
except Exception as e:
    print("schema import failed:", e)
    if hasattr(e, "read"):
        print(e.read().decode("utf-8", "replace")[:2000])
    raise
PY

cat > /etc/systemd/system/pocketbase.service.d/override.conf <<EOF
[Service]
Environment=MAX_BOT_TOKEN=${MAX_BOT_TOKEN}
Environment=MAX_BOT_WEBHOOK_SECRET=${MAX_BOT_WEBHOOK_SECRET}
Environment=PB_PUBLIC_URL=https://${DOMAIN}
EOF
chmod 600 /etc/systemd/system/pocketbase.service.d/override.conf
systemctl daemon-reload
systemctl restart pocketbase
wait_pb

rm -f /etc/nginx/sites-enabled/default
install -m 644 "$APP_DIR/config/nginx-app.conf" /etc/nginx/sites-available/tennis
cat > /etc/nginx/sites-available/tennis-bootstrap <<'NGX'
server {
    listen 80;
    server_name app.milenkih-team.ru milenkih-team.ru www.milenkih-team.ru;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 "bootstrap\n"; add_header Content-Type text/plain; }
}
NGX
ln -sfn /etc/nginx/sites-available/tennis-bootstrap /etc/nginx/sites-enabled/tennis
nginx -t
systemctl enable nginx
systemctl reload nginx

if ! certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$LETSENCRYPT_EMAIL" --redirect; then
  certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" --non-interactive --agree-tos -m "$LETSENCRYPT_EMAIL"
fi

if [[ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]]; then
  curl -fsSL -o /etc/letsencrypt/options-ssl-nginx.conf \
    https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf
fi
if [[ ! -f /etc/letsencrypt/ssl-dhparams.pem ]]; then
  openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
fi

ln -sfn /etc/nginx/sites-available/tennis /etc/nginx/sites-enabled/tennis
nginx -t
systemctl reload nginx

cd "$APP_DIR/client"
npm ci
npx vite build --base /

systemctl restart pocketbase

curl -sS -X POST "https://botapi.max.ru/subscriptions" \
  -H "Authorization: ${MAX_BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://${DOMAIN}/api/max-bot-webhook\",\"update_types\":[\"bot_started\",\"bot_stopped\"],\"secret\":\"${MAX_BOT_WEBHOOK_SECRET}\"}" \
  || true

echo "Bootstrap OK. Credentials: $CRED_FILE"
curl -sS "https://${DOMAIN}/health" || true
echo
