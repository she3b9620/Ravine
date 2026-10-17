# RAVINE Creator Capability Integration Audit

Status: implementation staged in the feature branch. No Supabase migration has been applied and no deployment has been performed.

## Implemented in this branch

- `lib/ravine-creator-capabilities.ts` is the canonical typed tier policy.
- `app/api/creator/publish-work/route.ts` publishes to the new Work Universe through a security-definer RPC that validates authentication, creator-identity ownership, tier eligibility, and optional quota enforcement.
- `components/StudioUpload.tsx` now offers Short Film and Feature Film separately. For compatibility with existing playback/query code, both are stored as `content_type='film'` plus `work_format='short_film'|'feature_film'`.
- `components/StudioWorkManager.tsx`, `app/[locale]/studio/page.tsx`, and `app/api/studio/publish-work/route.ts` preserve and return the new subtype field.
- `supabase/migrations/20261017150000_ravine_creator_studio_bridge.sql` maps legacy `public.creators` records to `public.ravine_next_creator_identities`, maintains the mapping when creator profiles change, adds the legacy `videos.work_format` field, and installs database-side publication-tier checks and an atomic quota ledger.
- The bridge also blocks Viewer-tier identities from transitioning new-domain live sessions to `status='live'`, and adds owner-scoped RLS policies/grants for live-session management.
- `app/api/admin/creator-tier/route.ts` exposes a tier-assignment endpoint backed by `ravine_admin_set_creator_tier`; the database RPC validates the existing platform-admin predicate and the allowed tier vocabulary.
- Monthly quota checks read `ravine_creator_capability_settings.monthly_quotas_enabled`, which is provisioned as `false`. Publishing eligibility by tier is enforced regardless of that flag; numeric quota limits remain inactive until product approval.
- Existing legacy creator profiles are migrated as `elevated_creator` to avoid unexpectedly removing their existing Podcast/Documentary publishing during the bridge. New creator records linked by the synchronization trigger start at `creator`. Reclassification should be performed through a trusted administrative workflow, never a client-supplied tier.

## Database safety and compatibility

- The new identity/work domain remains distinct from legacy tables, with an explicit `legacy_creator_id` mapping rather than assuming equal IDs.
- Legacy film playback remains compatible: `videos.content_type` stays `film`, and the subtype is stored separately. Old `film` records are treated as Feature Films for tier checks.
- Tier checks execute in database triggers, so direct Supabase table writes cannot bypass them by skipping the Next.js route.
- The creator identity row is locked during publish eligibility/quota checks; usage is written by an AFTER trigger in the same transaction.
- Both quota ledgers are historical records with their foreign keys removed so deleting a work cannot erase its current-month quota usage.
- Numeric quota enforcement stays disabled by default. The migration seeds current-month already-published work into the ledger based on `created_at` because the legacy table does not have a reliable `published_at` field.
- No migration has been applied to the live Supabase project. The domain foundation migration (`20260907120000...`) is not in the project's applied migration history.
- The live migration history records `20260907102607 ravine_founder_upload_policy`, while the repository file is named `20260907082000_ravine_founder_upload_policy.sql`. That version-prefix mismatch must be reconciled on a non-production clone before any blanket `supabase db push`; do not blindly replay the repository migration chain against the live project.
- Review the complete staged sequence and migration history, then test the bridge on a non-production database before runtime deployment.

## Follow-up review — 2026-10-17

- Fixed a quota-accounting edge case in `ravine_publish_creator_work`: an existing usage row now skips a new quota check only when the row is for the same work type. Reclassifying an already-published work into a limited type therefore checks the destination type's quota.
- Added a regression test that verifies the SQL guard remains present.
- These changes are committed to this feature branch only. The test suite/build status still needs confirmation, and the migration remains unapplied.

## Live database readiness check — 2026-10-17

A read-only check of the connected Supabase project confirmed that the staged Work Universe/capability tables are not present there yet: `ravine_next_creator_identities`, `ravine_next_works`, `ravine_creator_capability_settings`, `ravine_creator_publish_quota_usage`, `ravine_legacy_creator_publish_quota_usage`, and `ravine_next_live_sessions` were all absent. The live migration history currently ends at `20260907102607 ravine_founder_upload_policy`.

This confirms the capability migrations must not be treated as already installed. The project also has a migration-history mismatch: the recorded founder policy version is `20260907102607`, while the repository filename uses `20260907082000`. The repository's `20260907120000_ravine_platform_domain_foundation.sql` is not recorded as applied. Do not apply the staged migration sequence to this project until the history mismatch and a safe, non-production rehearsal are resolved.

## Remaining validation gates

1. GitHub Actions policy tests and focused lint must pass after the Studio integration changes.
2. Full repository lint currently has unrelated pre-existing errors; these remain out of scope.
3. The production build must pass independently of the full-lint job.
4. Run the staged SQL migrations against a disposable/non-production Supabase project, then test creator mapping, draft creation, publish/unpublish, all tier restrictions, quota concurrency, live eligibility, and legacy film playback.
5. Confirm the active-identity UX and trusted admin tier assignment workflow before enabling numeric quotas.

## Explicit non-actions

- No Vercel deployment.
- No Supabase migration applied.
- No merge to `main` or Production.
- No numeric quota enforcement enabled.

## Follow-up — live-session API foundation

- Added `app/api/live/sessions/route.ts` on the feature branch for authenticated live-session creation/scheduling, starting, ending, and cancelling.
- Creation verifies that the selected creator identity belongs to the authenticated account. If a related work is supplied, it must belong to the same identity.
- The route writes through the authenticated Supabase client and relies on the staged database RLS policies and live-tier trigger as the final authorization boundary. Starting a session transitions it to `live`, where the database trigger rejects Viewer-tier identities.
- The route returns a service-unavailable response when the staged live-session schema is not installed, rather than reporting a missing identity/session as an authorization failure.
- The route is included in focused ESLint and production-build CI. It is an API foundation only: no live-session UI/provider integration is claimed complete, and the database migration remains unapplied.


## Follow-up — live-session scheduling guard and regression coverage

- Tightened `POST /api/live/sessions`: session creation now requires a valid future `startsAt` and always creates the session in `scheduled` state. The API cannot create a new session directly in a fake `live` state by omitting the date or sending a past date.
- Added regression tests for this server-side guard and for the UI's explicit distinction between session-state management and actual streaming.
- Added `StudioLiveManager.tsx` to the focused lint/build workflow path coverage.
- This does not add a media provider, alter the unresolved provider decision, apply migrations, deploy, or merge.


## Live-provider safety gate

- Until the product's Live provider is selected and integrated, the API rejects `start` actions with HTTP 503 and the Studio control is disabled. A scheduled session can no longer be represented as live without a real provider.
- Scheduling and cancellation remain available when the staged schema is installed. Ending remains available only for sessions already marked live by a trusted, provider-integrated path.


## Migration preflight coverage — 2026-10-17

- Added an automated regression test that checks the staged platform-domain prerequisites, capability-schema dependency, publishing RPC, legacy Studio bridge triggers, and the documented live migration-history mismatch.
- Added `tests/ravine-migration-smoke.sh` and an isolated PostgreSQL 16 GitHub Actions service. The ordered domain, capability-schema, publishing-RPC, and Studio-bridge migrations execute successfully against a disposable PostgreSQL database.
- The smoke test seeds a legacy creator and a published podcast, then verifies the creator is grandfathered as `elevated_creator`, existing podcast usage is preserved in the legacy quota ledger, and a newly inserted legacy creator receives a synced `creator` identity.
- The smoke harness uses minimal Supabase-compatible auth/admin/legacy-table stubs. It proves SQL syntax and this staged migration path against PostgreSQL, but it is not a byte-for-byte clone of the connected Supabase schema.
- The latest CI run for commit `ea9e4215` passed all four jobs, including the PostgreSQL migration smoke test.
- Read-only inspection of the connected Supabase project still shows the live history ending at `20260907102607 ravine_founder_upload_policy`. No migration was applied during this check.
- Before any live change, resolve the filename/history mismatch against the actual production schema and review a schema-diff plan. The ephemeral smoke test is not approval to apply migrations to production.

## Read-only production schema preflight — 2026-10-17

- Catalog inspection only; no DDL/DML was executed against the connected Supabase project.
- The current `public.creators` table contains the legacy fields used by the bridge (`id`, `user_id`, `name`, `username`, `avatar_url`, `bio`, `specialty`). The current `public.videos` table contains `creator_id`, `user_id`, `content_type`, `published`, and `created_at`; `work_format` is not present and would be added by the staged bridge migration.
- The staged `ravine_next_*` tables and new quota ledgers are not present in the live schema.
- Aggregate-only impact estimate: 1 legacy creator currently has a non-null `user_id`; 16 legacy videos are published (6 `short`, 10 `video`). None of those published rows were created in the current UTC month, so the bridge's current-month quota-ledger backfill would currently find zero qualifying published rows. No row contents were retrieved for this estimate.
- Existing production triggers on `creators` and `videos` include protected-field and upload-policy handlers. Their presence makes an exact-schema rehearsal and explicit trigger-order review mandatory before any production rollout; the minimal ephemeral smoke harness does not emulate these existing triggers.

