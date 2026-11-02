#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
PORT="${MICROAXIS_TEST_DB_PORT:-55432}"
DB="microaxis_test"

cleanup() {
  if [[ -f "$TMP/data/postmaster.pid" ]]; then
    pg_ctl -D "$TMP/data" -m fast stop >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP"
}
trap cleanup EXIT

initdb -D "$TMP/data" -A trust -U postgres --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/postgres.log" start >/dev/null

createdb -h "$TMP" -p "$PORT" -U postgres "$DB"

psql -h "$TMP" -p "$PORT" -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/tests/00_stubs.sql"

for migration in "$ROOT"/supabase/migrations/*.sql; do
  echo "Applying $(basename "$migration")"
  psql -h "$TMP" -p "$PORT" -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q -f "$migration"
done

echo "Applying seed"
psql -h "$TMP" -p "$PORT" -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/seed.sql"

echo "Running schema assertions"
psql -h "$TMP" -p "$PORT" -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/tests/01_schema.sql"

echo "Running RLS assertions"
psql -h "$TMP" -p "$PORT" -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/tests/rls.sql"

echo "Running workspace RPC assertions"
psql -h "$TMP" -p "$PORT" -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/tests/02_workspace_rpc.sql"

echo "SQL schema, RLS, and workspace RPC tests passed."
