# RAVINE Creator Capability Integration Audit

Status: implementation staged in the feature branch. No Supabase migration has been applied and no deployment has been performed.

## Implemented in this branch

- `lib/ravine-creator-capabilities.ts` is the canonical typed tier policy.
- `app/api/creator/publish-work/route.ts` publishes to the new Work Universe through a security-definer RPC that validates authentication, creator-identity ownership, tier eligibility, and optional quota enforcement.
- `components/StudioUpload.tsx` now offers Short Film and Feature Film separately. For compatibility with existing playback/query code, both are stored as `content_type='film'` plus `work_format='short_film'|'feature_film'`.
- `components/StudioWorkManager.tsx`, `app/[locale]/studio/page.tsx`, and `app/api/studio/publish-work/route.ts` preserve and return the new subtype field.
- `supabase/migrations/20261017150000_ravine_creator_studio_bridge.sql` maps legacy `public.creators` records to `public.ravine_next_creator_identities`, maintains the mapping when creator profiles change, adds the legacy `videos.work_format` field, and installs database-side publication-tier checks and an atomic quota ledger.
- The bridge also blocks Viewer-tier identities from transitioning new-domain live sessions to `status='live'`.
- Monthly quota checks read `ravine_creator_capability_settings.monthly_quotas_enabled`, which is provisioned as `false`. Publishing eligibility by tier is enforced regardless of that flag; numeric quota limits remain inactive until product approval.
- Existing legacy creator profiles are migrated as `elevated_creator` to avoid unexpectedly removing their existing Podcast/Documentary publishing during the bridge. New creator records linked by the synchronization trigger start at `creator`. Reclassification should be performed through a trusted administrative workflow, never a client-supplied tier.

## Database safety and compatibility

- The new identity/work domain remains distinct from legacy tables, with an explicit `legacy_creator_id` mapping rather than assuming equal IDs.
- Legacy film playback remains compatible: `videos.content_type` stays `film`, and the subtype is stored separately. Old `film` records are treated as Feature Films for tier checks.
- Tier checks execute in database triggers, so direct Supabase table writes cannot bypass them by skipping the Next.js route.
- The creator identity row is locked during publish eligibility/quota checks; usage is written by an AFTER trigger in the same transaction.
- Numeric quota enforcement stays disabled by default. The migration seeds current-month already-published work into the ledger based on `created_at` because the legacy table does not have a reliable `published_at` field.
- No migration has been applied to the live Supabase project. The domain foundation migration (`20260907120000...`) is not in the project's applied migration history, so all staged migrations must be reviewed and applied in order in a non-production environment before runtime deployment.

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
