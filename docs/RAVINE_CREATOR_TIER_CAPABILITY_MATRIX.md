# RAVINE Creator Tier & Capability Matrix

Status: implementation foundation on `ravine/creator-capabilities-foundation-20261017`.
This is not a production migration and has not been deployed.

## Product model

A personal account is the ownership root. It can own multiple creator identities/channels. Each creator identity has its own tier, public profile experience, work portfolio, publishing permissions, monthly quota usage, and live eligibility. Switching the active identity must change the identity used for every create, upload, edit, publish, and live action.

The tier is attached to the creator identity, not trusted from client-provided form data or editable user metadata.

## Tier matrix

| Capability | Viewer | Creator | Elevated Creator | Artist | Elevated Artist |
|---|---:|---:|---:|---:|---:|
| Shorts / Cuts | Unlimited subject to anti-spam | Unlimited | Unlimited | Unlimited | Unlimited |
| Standard videos | 10/month | Unlimited | Unlimited | Unlimited | Unlimited |
| Podcasts | Not allowed | Not allowed | 5/month | Unlimited | Unlimited |
| Documentaries | Not allowed | Not allowed | 5/month | Unlimited | Unlimited |
| Short films | Not allowed | 2/month | 2/month | Unlimited | Unlimited |
| Feature films | Not allowed | 1/month | 1/month | 3/month | Unlimited |
| Start a live broadcast | No | Yes | Yes | Yes | Yes |

### Provisional assumptions requiring product confirmation

The original direction described these numbers as examples/approximate limits. Until explicitly finalized:
- The 5/month podcast limit and 5/month documentary limit are modeled separately, not as a combined pool.
- Creator and Elevated Creator each receive the proposed two short films and one feature film per month.
- “Unlimited” means no tier-specific monthly quota. It never bypasses anti-spam, upload-size, processing, safety, copyright/rights, moderation, or abuse-prevention limits.
- The viewer's Shorts access is not a promise of infinite request rate; platform anti-spam controls still apply.

Do not silently change these assumptions. Keep them clearly identified as provisional until the product owner confirms them.

## Authorization and quota rules

1. Resolve the authenticated user on the server.
2. Resolve the owned creator identity from the database; never trust an owner ID or tier sent by the browser.
3. Check the identity's current tier and requested content type.
4. Count that identity's quota-consuming items for the current calendar month in the platform's agreed timezone.
5. Enforce quota atomically at the database boundary to prevent parallel requests from exceeding a limit.
6. Record the creator identity, content type, quota period, and outcome for audit/support.
7. Apply the same checks to direct API/server actions, drafts moving to publication, scheduled publication, retries, and any alternate upload path.
8. Keep account ownership, team roles, platform administrators, and creator-tier privileges separate.
9. Tier changes must not silently delete existing work. They may restrict new publishing; existing work should follow an explicit grandfathering/moderation policy.
10. Live creation requires Creator or higher; joining/viewing a live is a separate viewer capability.

## Work types and dedicated experiences

- Short / Cut: vertical, rapid discovery, short-form player.
- Video: standard cinematic player and work page.
- Podcast: audio/video episodes, seasons, guests, and chapters.
- Documentary: contextual work page, chapters, credits, and sources where relevant.
- Short film: film-specific page with trailer, credits, BTS, and reviews.
- Feature film: full project page, credits/team, trailer, supporting materials, reviews, and related works.

A content type is not merely a label. It must drive the publishing flow, validation, player/page experience, and server-side capabilities.

## Implementation sequence

1. Review and reconcile the local Git state with the remote branch before syncing or merging anything.
2. Finalize the provisional quota choices above.
3. Add database-backed tier assignment and identity-level quota ledger/usage model through a reviewed Supabase migration. Do not apply it to Production without explicit approval.
4. Add database/RLS-safe server-side authorization and atomic quota enforcement.
5. Wire Creator Studio and upload actions to the active identity and capability registry.
6. Wire live creation, identity pages, and work-type-specific players.
7. Add policy tests for each tier/content type and quota boundary, plus authorization/RLS checks.
8. Run governance checks, lint, build, and review a Preview only after explicit deployment approval.

## Current implementation boundary

- `lib/ravine-creator-capabilities.ts` defines the typed product policy.
- `lib/ravine-work-universe.ts` and `components/RAVINEWorkContext.tsx` recognize the expanded work taxonomy while preserving legacy `film`.
- `app/api/creator/publish-work/route.ts` is the new-domain publishing endpoint. It calls a database RPC; the browser cannot supply an owner or tier as authority.
- `supabase/migrations/20261017110000_ravine_creator_capability_schema_foundation.sql` stages the tier column and work-type vocabulary.
- `supabase/migrations/20261017130000_ravine_creator_publish_rpc.sql` stages the transactional publishing function, ownership checks, tier eligibility, quota ledger, and a `monthly_quotas_enabled=false` setting. Tier restrictions are enforced by this new endpoint when its migrations are applied; provisional numeric quotas remain disabled until approved.
- `tests/ravine-creator-capabilities.test.mjs` covers the pure policy and work-type normalization; run it with `npm run test:ravine-capabilities`.
- `.github/workflows/ravine-creator-capabilities.yml` runs the Node test suite on relevant pushes and pull requests.

## Studio integration boundary

The existing Creator Studio continues to upload media and preserve work IDs in legacy `public.videos` so existing players, chapters, media assets, likes, saves, and watch history remain compatible. The staged bridge migration `20261017150000_ravine_creator_studio_bridge.sql` explicitly maps each legacy `public.creators` row to a `ravine_next_creator_identities` row using `legacy_creator_id`; it does not assume matching numeric IDs.

The Studio form and work manager now expose Short Film and Feature Film as distinct formats while storing `content_type='film'` plus `work_format` to preserve legacy compatibility. Database triggers validate tier eligibility on publication and record monthly usage transactionally; numeric quota checks remain disabled by the feature flag. A separate trigger blocks Viewer-tier identities from transitioning new-domain live sessions to `status='live'`.

Existing approved creator profiles are migrated as `elevated_creator` to preserve current Podcast/Documentary publishing during rollout; newly synchronized creator profiles start at `creator`. Tier changes must be performed through a trusted administrative workflow. The broader active-identity switcher is still not wired through every platform write path.

The migrations are staged only and have not been applied to any Supabase project. Do not deploy this branch before the staged migrations are reviewed and applied in order to a non-production project, integration scenarios pass, and a production build is verified.
