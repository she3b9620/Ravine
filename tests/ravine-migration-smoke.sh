#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must point to the ephemeral PostgreSQL test database}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$root/tests/sql/ravine-migration-smoke-bootstrap.sql"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$root/supabase/migrations/20260907120000_ravine_platform_domain_foundation.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$root/supabase/migrations/20261017110000_ravine_creator_capability_schema_foundation.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$root/supabase/migrations/20261017130000_ravine_creator_publish_rpc.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-000000000001', 'migration-smoke@example.test');
INSERT INTO public.creators (user_id, name, username, avatar_url, bio, specialty) VALUES ('00000000-0000-4000-8000-000000000001', 'Smoke Test Creator', 'smoke-test-creator', null, 'migration smoke fixture', 'film');
INSERT INTO public.videos (creator_id, user_id, content_type, published, created_at) SELECT c.id, c.user_id, 'podcast', true, now() FROM public.creators c WHERE c.username = 'smoke-test-creator';
SQL
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
  IF NOT EXISTS (SELECT 1 FROM public.ravine_next_creator_identities i JOIN public.creators c ON c.id = i.legacy_creator_id WHERE c.username = 'smoke-test-creator' AND i.creator_tier = 'elevated_creator') THEN
    RAISE EXCEPTION 'legacy creator was not grandfathered as elevated_creator';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ravine_legacy_creator_publish_quota_usage q JOIN public.videos v ON v.id = q.video_id JOIN public.creators c ON c.id = v.creator_id WHERE c.username = 'smoke-test-creator' AND q.work_type = 'podcast') THEN
    RAISE EXCEPTION 'existing published legacy podcast was not recorded in quota ledger';
  END IF;
  INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-000000000002', 'new-creator@example.test');
  INSERT INTO public.creators (user_id, name, username, specialty) VALUES ('00000000-0000-4000-8000-000000000002', 'New Creator', 'new-smoke-creator', 'film');
  IF NOT EXISTS (SELECT 1 FROM public.ravine_next_creator_identities i JOIN public.creators c ON c.id = i.legacy_creator_id WHERE c.username = 'new-smoke-creator' AND i.creator_tier = 'creator') THEN
    RAISE EXCEPTION 'new legacy creator trigger did not create creator-tier identity';
  END IF;
END
$$;

SELECT 'RAVINE migration smoke test passed' AS result;
SQL
