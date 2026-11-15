#!/usr/bin/env bash
# Kör migrationerna och behörighetstesterna mot en tom, lokal Postgres.
# Användning: PGHOST=/tmp PGPORT=54329 PGUSER=postgres ./supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
db="eggly_test_$$"
createdb "$db"
trap 'dropdb --if-exists "$db"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$db" -f supabase/local/00_fake_supabase.sql
for f in supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$f"; done
for f in supabase/seed/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$f" >/dev/null; done
psql -q -d "$db" -t -A -c "select count(*) || ' färdigheter, ' || (select count(*) from eggly.skill_prereqs) || ' förkunskaper inlästa' from eggly.skills"
psql -q -t -A -v ON_ERROR_STOP=1 -d "$db" -f supabase/tests/rls_test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
