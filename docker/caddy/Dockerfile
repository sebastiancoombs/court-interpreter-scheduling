# Minimal Caddy image baking in the unified front-door config.
# Railway sets $PORT at runtime; the Caddyfile binds `:{$PORT}` so the
# service is reachable on the platform-assigned port without a rebuild.
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
