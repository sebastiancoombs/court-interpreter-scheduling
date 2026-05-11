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
SCHEMA_OUT="supabase/migrations/${TS}_bcgov_schema.sql"
SEED_OUT="supabase/migrations/$((TS + 1))_bcgov_seed_data.sql"
mkdir -p supabase/migrations

# Drop any earlier bcgov dumps so only the latest pair lives in supabase migrations.
rm -f supabase/migrations/*_bcgov_schema.sql supabase/migrations/*_bcgov_seed_data.sql

# Schema dump — pure DDL.
{
  echo "-- bcgov schema, captured from \`alembic upgrade head\` against PostgreSQL 15."
  echo "-- Re-generate via \`bash api/scripts/dump_schema.sh\` after model changes."
  echo ""
  docker exec "$CONTAINER" pg_dump --schema-only --no-owner --no-acl --no-comments -U postgres cisdb \
    | grep -v '^\\restrict' | grep -v '^\\unrestrict'
} > "$SCHEMA_OUT"

# Seed-data dump — auto-captures every non-empty table EXCEPT a skip-list
# for tables whose seed data is irrelevant or sensitive:
#   - alembic_version: alembic state, not real data
#   - interpreter / interpreter_language: PII placeholders from our stub
#     xlsx; real data comes from a separate (gitignored) seed artifact
# Anything else with rows after `alembic upgrade head` lands in the
# production seed migration. Means new bcgov bulk_insert calls in future
# upstream pulls get picked up automatically.
SKIP_TABLES_RE='^(alembic_version|interpreter|interpreter_language)$'
SEED_TABLES=$(docker exec "$CONTAINER" psql -U postgres -d cisdb -At -c \
  "SELECT relname FROM pg_stat_user_tables WHERE n_live_tup > 0 ORDER BY relname;" \
  | grep -vE "$SKIP_TABLES_RE" || true)

{
  echo "-- bcgov seed data — equivalent to what bcgov alembic op.bulk_insert"
  echo "-- did during upgrade. Companion to the bcgov_schema.sql dump."
  echo "-- Re-generate via \`bash api/scripts/dump_schema.sh\`."
  echo "--"
  echo "-- Tables included:"
  for t in $SEED_TABLES; do echo "--   $t"; done
  echo ""
  for t in $SEED_TABLES; do
    docker exec "$CONTAINER" pg_dump --data-only --no-owner --no-acl --no-comments \
      --inserts --on-conflict-do-nothing --table="$t" \
      -U postgres cisdb \
      | grep -v '^\\restrict' | grep -v '^\\unrestrict' | grep -v '^--$' | grep -vE '^-- (Dumped|PostgreSQL)' || true
  done
} > "$SEED_OUT"

echo "✓ wrote $SCHEMA_OUT"
echo "  tables: $(grep -c '^CREATE TABLE' "$SCHEMA_OUT")"
echo "  indexes: $(grep -cE '^CREATE (UNIQUE )?INDEX' "$SCHEMA_OUT")"
echo "  types: $(grep -c '^CREATE TYPE' "$SCHEMA_OUT")"
echo "✓ wrote $SEED_OUT"
echo "  inserts: $(grep -c '^INSERT' "$SEED_OUT")"
