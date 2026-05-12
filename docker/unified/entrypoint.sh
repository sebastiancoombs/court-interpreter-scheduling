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

# Derive EA's individual DB vars from DATABASE_URL when they aren't already
# set. Format: postgresql://user:password@host:port/dbname
if [ -n "${DATABASE_URL:-}" ]; then
  _url="${DATABASE_URL}"
  # Strip scheme
  _url="${_url#postgresql://}"
  _url="${_url#postgres://}"
  # user:password@rest
  _userpass="${_url%%@*}"
  _hostpath="${_url#*@}"
  export DB_USERNAME="${DB_USERNAME:-${_userpass%%:*}}"
  export DB_PASSWORD="${DB_PASSWORD:-${_userpass#*:}}"
  # host:port/dbname
  _hostport="${_hostpath%%/*}"
  export DB_HOST="${DB_HOST:-${_hostport%%:*}}"
  export DB_PORT="${DB_PORT:-${_hostport##*:}}"
  export DB_NAME="${DB_NAME:-${_hostpath#*/}}"
  export DB_DRIVER="${DB_DRIVER:-postgre}"
fi

# Ensure EA writable dirs exist and are owned by the php-fpm user. EA's
# Sessions / cache / uploads paths land in storage/ — without this the
# CodeIgniter session handler 500s on first hit.
mkdir -p /var/www/html/ea/storage/{backups,cache,logs,sessions,uploads}
chown -R www-data:www-data /var/www/html/ea/storage

# php-fpm by default listens on 127.0.0.1:9000; we want a unix socket so
# nginx's `fastcgi_pass unix:/run/php/php8.2-fpm.sock` works. Patch the
# default pool config at startup so the image stays declarative. Also
# disable clear_env and explicitly forward the EA-relevant vars —
# php-fpm strips its parent environment by default, which would leave
# EA's config.php falling back to `DB_HOST=postgres` etc.
PHP_POOL=/etc/php/8.2/fpm/pool.d/www.conf
if [ -f "$PHP_POOL" ]; then
  sed -i 's|^listen = .*|listen = /run/php/php8.2-fpm.sock|' "$PHP_POOL"
  sed -i 's|^;listen.owner = .*|listen.owner = www-data|' "$PHP_POOL"
  sed -i 's|^;listen.group = .*|listen.group = www-data|' "$PHP_POOL"
  sed -i 's|^;clear_env = .*|clear_env = no|' "$PHP_POOL"
  {
    echo ""
    echo "; EA env passthrough appended by entrypoint.sh"
    for v in BASE_URL DB_DRIVER DB_HOST DB_PORT DB_NAME DB_USERNAME DB_PASSWORD LANGUAGE DEBUG_MODE JWT_SECRET_KEY APP_ENV; do
      val=$(printenv "$v" || true)
      [ -n "$val" ] && printf 'env[%s] = "%s"\n' "$v" "$val"
    done
  } >> "$PHP_POOL"
fi
mkdir -p /run/php && chown www-data:www-data /run/php

# Set EA's BASE_URL from Railway's public hostname if not provided.
# RAILWAY_PUBLIC_DOMAIN is injected automatically by Railway.
if [ -z "${BASE_URL:-}" ] && [ -n "${RAILWAY_PUBLIC_DOMAIN:-}" ]; then
  export BASE_URL="https://${RAILWAY_PUBLIC_DOMAIN}"
fi

exec "$@"
