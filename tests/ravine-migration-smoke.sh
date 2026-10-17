#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must point to the ephemeral PostgreSQL test database}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$root/tests/sql/ravine-migration-smoke-bootstrap.sql"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$root/supabase/migrations/20260907120000_ravine_platform_domain_foundation.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$root/supabase/migrations/20261017110000_ravine_creator_capability_schema_foundation.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$root/supabase/migrations/20261017130000_ravine_creator_publish_rpc.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$root/supabase/migrations/20261017150000_ravine_creator_studio_bridge.sql"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF to_regclass('public.ravine_next_creator_identities') IS NULL THEN
    RAISE EXCEPTION 'creator identity table missing after migration smoke test';
  END IF;
  IF to_regclass('public.ravine_next_works') IS NULL THEN
    RAISE EXCEPTION 'work table missing after migration smoke test';
  END IF;
  IF to_regclass('public.ravine_creator_publish_quota_usage') IS NULL THEN
    RAISE EXCEPTION 'publish quota ledger missing after migration smoke test';
  END IF;
  IF to_regclass('public.ravine_legacy_creator_publish_quota_usage') IS NULL THEN
    RAISE EXCEPTION 'legacy publish quota ledger missing after migration smoke test';
  END IF;
  IF to_regprocedure('public.ravine_publish_creator_work(bigint,bigint,text,text,text,text,text,text)') IS NULL THEN
    RAISE EXCEPTION 'publish RPC missing after migration smoke test';
  END IF;
  IF to_regprocedure('public.ravine_admin_set_creator_tier(bigint,text)') IS NULL THEN
    RAISE EXCEPTION 'admin tier RPC missing after migration smoke test';
  END IF;
END
$$;

SELECT 'RAVINE migration smoke test passed' AS result;
SQL
