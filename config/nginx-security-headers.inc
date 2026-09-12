# Общие security headers. Подключать через include в каждом location,
# где уже есть add_header — иначе nginx не наследует server-level headers.
add_header Content-Security-Policy "frame-ancestors 'self' https://web.max.ru https://max.ru https://*.max.ru; default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://st.max.ru; connect-src 'self' https: wss:; form-action 'self'; upgrade-insecure-requests" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
