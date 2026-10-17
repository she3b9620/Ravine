# RAVINE Creator Capability Integration Audit

Status: investigation only. No runtime authorization or quota behavior is changed by this document.

## Current write-path findings

The existing Studio publish endpoint is `app/api/studio/publish-work/route.ts` and writes to legacy `public.videos`. It currently accepts only `video`, `short`, `documentary`, `podcast`, and legacy `film`.

The existing staged upload-policy migration `20260907082000_ravine_founder_upload_policy.sql` installs a BEFORE INSERT trigger on `public.videos`. That trigger independently validates the legacy content-type set and applies the old account/creator upload-limit model. The same migration constrains `videos.content_type` to the old set.

The new capability-schema migration adds `creator_tier` to `public.ravine_next_creator_identities` and expands `public.ravine_next_works.work_type`; these are not the same records as legacy `public.creators` and `public.videos`.

## Why the new tiers are not enforced yet

There are currently two different identity/work domains:
- Legacy runtime: `auth.users` -> `public.creators` -> `public.videos`.
- New platform foundation: `auth.users` -> `public.ravine_next_creator_identities` -> `public.ravine_next_works`.

The current publish route uses the legacy domain. The new tier field is in the new domain. Simply checking `creator_tier` in the legacy publish route would not establish ownership or prove that the selected identity owns the legacy work.

Likewise, allowing `short_film` or `feature_film` in the route alone is insufficient: the legacy database constraint and trigger currently reject those values. Expanding those constraints without a deliberate migration of the existing quota trigger could accidentally bypass legacy quota accounting or apply the wrong quota model.

## Safe implementation sequence

1. Decide whether new uploads should write to the new Work Universe or remain in legacy `videos` for this phase.
2. Establish an explicit, server-validated mapping from the authenticated account and active creator identity to the work being created or published.
3. Implement atomic quota reservation in the same write transaction as publish, keyed by creator identity and calendar month; do not rely on client-side counts.
4. Define migration/compatibility behavior for existing legacy videos and their existing upload limits before expanding the legacy trigger.
5. Gate live session creation on the same verified identity-tier capability source.
6. Add route/database integration tests and run the full Next.js build and checks before merging.

## Provisional product policy

The quota numbers remain provisional. This audit does not treat them as approved production rules and does not enforce them in SQL. A null tier limit means no tier-specific quota; platform-wide abuse limits and safety controls still apply.
