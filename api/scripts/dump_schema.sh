#!/usr/bin/env bash
# Regenerate supabase/migrations/<timestamp>_bcgov_schema.sql by running
# bcgov's alembic migration chain against an ephemeral local Postgres,
# then pg_dumping the resulting schema.
#
# Run after upstream pulls / new alembic migrations are merged. Pipe-safe.
#
# Usage: bash api/scripts/dump_schema.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
cd "$REPO_ROOT"

CONTAINER=cis-tempdb
IMAGE=cis-api-dump
PG_PORT=55432

trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true' EXIT

echo "▶ starting ephemeral postgres on :${PG_PORT}"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run --rm -d --name "$CONTAINER" -p "${PG_PORT}:5432" \
  -e POSTGRES_PASSWORD=dump -e POSTGRES_DB=cisdb \
  postgres:15 >/dev/null

# pg_isready loop, max 30 s.
for _ in {1..30}; do
  docker exec "$CONTAINER" pg_isready -U postgres -d cisdb >/dev/null 2>&1 && break
  sleep 1
done

echo "▶ building api image"
docker build --quiet -f api/Dockerfile -t "$IMAGE" api/ >/dev/null

echo "▶ alembic upgrade head"
docker run --rm --network host \
  -e DATABASE_NAME=cisdb -e DATABASE_USER=postgres -e DATABASE_PASSWORD=dump \
  -e DB_SERVICE_HOST=host.docker.internal -e DB_SERVICE_PORT=${PG_PORT} \
  -e DATABASE_ENGINE=postgresql -e DATABASE_SERVICE_NAME=db \
  -e OIDC_RP_PROVIDER_URL= -e OIDC_RP_PROVIDER_REALM= -e OIDC_RP_CLIENT_ID= \
  -e OIDC_RP_CLIENT_SECRET= -e OIDC_RP_KC_IDP_HINT= \
  -e JC_INTERFACE_API_FILE_URL= -e JC_INTERFACE_API_LOCATION_URL= \
  -e JC_INTERFACE_API_USERNAME= -e JC_INTERFACE_API_PASSWORD= \
  -e JC_INTERFACE_API_FILE_USERNAME= -e JC_INTERFACE_API_FILE_PASSWORD= \
  -e JC_INTERFACE_FILE_AGENCY_ID= -e JC_INTERFACE_FILE_PART_ID= \
  -e EFILING_HUB_API_BASE_URL= -e EFILING_HUB_KEYCLOAK_CLIENT_ID= \
  -e EFILING_HUB_KEYCLOAK_BASE_URL= -e EFILING_HUB_KEYCLOAK_SECRET= \
  -e EFILING_HUB_KEYCLOAK_REALM= \
  -e GOOGLE_MAP_URL= -e OPENROAD_MAP_URL= \
  -e CHES_AUTH_URL= -e CHES_EMAIL_URL= \
  -e EMAIL_SERVICE_CLIENT_ID= -e EMAIL_SERVICE_CLIENT_SECRET= \
  -e PDF_SERVICE_URL= -e RECIPIENT_EMAILS= \
  -e DATA_SECURITY_KEY= -e JWT_SECRET_KEY=dump -e CORS_ORIGIN='["*"]' \
  "$IMAGE" alembic upgrade head

TS=$(date -u +%Y%m%d%H%M%S)
OUT="supabase/migrations/${TS}_bcgov_schema.sql"
mkdir -p supabase/migrations

# Drop any earlier bcgov_schema dump so only the latest is in supabase migrations.
rm -f supabase/migrations/*_bcgov_schema.sql

{
  echo "-- bcgov schema, captured from \`alembic upgrade head\` against PostgreSQL 15."
  echo "-- Re-generate via \`bash api/scripts/dump_schema.sh\` after model changes."
  echo ""
  docker exec "$CONTAINER" pg_dump --schema-only --no-owner --no-acl --no-comments -U postgres cisdb \
    | grep -v '^\\restrict' | grep -v '^\\unrestrict'
} > "$OUT"

echo "✓ wrote $OUT"
echo "  tables: $(grep -c '^CREATE TABLE' "$OUT")"
echo "  indexes: $(grep -cE '^CREATE (UNIQUE )?INDEX' "$OUT")"
echo "  types: $(grep -c '^CREATE TYPE' "$OUT")"
