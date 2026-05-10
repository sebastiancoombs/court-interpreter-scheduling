#!/usr/bin/env bash
# Entrypoint for the unified container.
# - Renders nginx.conf with the platform-assigned $PORT.
# - Sets up the EA writable dirs (storage/, etc.) since the image is built
#   from a clean checkout but EA wants those writable at runtime.
# - Hands off to supervisord (or whatever CMD is).
set -euo pipefail

: "${PORT:=8000}"
export PORT

# Render the nginx config with $PORT substituted in.
envsubst '${PORT}' < /etc/nginx/nginx.conf.tmpl > /etc/nginx/nginx.conf

# Ensure EA writable dirs exist and are owned by the php-fpm user. EA's
# Sessions / cache / uploads paths land in storage/ — without this the
# CodeIgniter session handler 500s on first hit.
mkdir -p /var/www/html/ea/storage/{backups,cache,logs,sessions,uploads}
chown -R www-data:www-data /var/www/html/ea/storage

# php-fpm by default listens on 127.0.0.1:9000; we want a unix socket so
# nginx's `fastcgi_pass unix:/run/php/php8.2-fpm.sock` works. Patch the
# default pool config at startup so the image stays declarative.
PHP_POOL=/etc/php/8.2/fpm/pool.d/www.conf
if [ -f "$PHP_POOL" ]; then
  sed -i 's|^listen = .*|listen = /run/php/php8.2-fpm.sock|' "$PHP_POOL"
  sed -i 's|^;listen.owner = .*|listen.owner = www-data|' "$PHP_POOL"
  sed -i 's|^;listen.group = .*|listen.group = www-data|' "$PHP_POOL"
fi
mkdir -p /run/php && chown www-data:www-data /run/php

exec "$@"
