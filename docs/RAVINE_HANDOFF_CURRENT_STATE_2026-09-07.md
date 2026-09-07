# RAVINE — Current Execution Handoff

Date: 2026-09-07
Repository: `she3b9620/Ravine`
Working branch: `ravine/clean-rebuild`
Production/main: untouched.
Deployment: none performed.

## Current HEAD

The branch continues on the latest commit after the Creator Ecosystem and identity-switcher changes. Always read `ravine/clean-rebuild` before the next edit.

## UI state already implemented

- Home Welcome: real 3000ms hold, settling/settled lifecycle, logout resets the Welcome completion marker, image/card remains visible with gentler final shrink.
- Sidebar: anchored at 78px under header; opaque, no backdrop blur; only internal option content moves downward on desktop; sidebar geometry is unchanged.
- Search: real popup state, Escape, filters, live `/api/search` while typing with debounce + AbortController, removed old discovery sentence, separated result metadata, Search CTA commits to Discover.
- Light Search: real In/Out animation with directional close.
- Discover: intended enhancement CSS is explicitly imported and card hierarchy is scoped to Discover.
- Language selector: inside interaction stays open; outside pointer click closes it; language selection closes before navigation.
- Guest Home About: exact existing About block is re-positioned immediately after Guest Hero across client navigation/rerender without changing its copy.
- Discovery pathway numbers: numeric marker is slightly larger/clearer only.

## Product direction

`docs/RAVINE_PRODUCT_ECOSYSTEM_BLUEPRINT_2026-09-07.md` records the approved direction for:

Personal Account -> multiple Creator Identities -> Creator Universe -> Broadcast -> Public/Members/Circle Communities -> Memberships/Exclusive Drops -> Projects -> Ratings/Reviews -> Live/Co-Live/Guest/Stage -> Sessions -> Spaces -> Gaming -> Watch Parties -> Collections/Idea Boards -> Shows/Events -> Creator Promotion -> External Identity Linking -> Opportunities -> delegated Creator Teams -> RAVINE Intelligence.

## Actual new implementation in this continuation

### Personal Account / Creator Identity

`components/CreatorIdentitySwitcher.tsx` is actively rendered inside `components/AccountMenu.tsx`.

It discovers all `creators` owned by the current authenticated user through `creators.user_id`, offers Personal Mode plus owned Creator Identities, persists a selected creator in localStorage and cookie `ravine-active-creator-id`, emits `ravine-identity-change`, navigates to the selected creator, and links to the existing creator-application flow for creating another identity.

This is a real UI foundation. It is **not** a claim that every creator-specific write/read path already uses the active identity.

`app/[locale]/ravine-creator-identity.css` styles the switcher and is imported by `app/[locale]/layout.tsx`.

### Creator Ecosystem database foundation

`supabase/migrations/20260907070000_ravine_creator_ecosystem.sql` is staged in the repository. It models:

- membership tiers and memberships
- creator Broadcast and Broadcast messages
- Creator Circles
- work access policies for Exclusive Drops
- Live events, participants/roles, questions and post-Live sessions
- RAVINE Spaces and participants
- Ratings/Reviews
- external creator links
- Spotlight
- creator opportunities
- Collections and collection items
- Watch Parties
- creator-owned community linkage and join policy extensions

**The migration has not been applied to the connected Supabase project in this execution.** The connected project has not been established as a safe non-production database for this branch.

## Radio

Radio is unchanged and remains deferred for the dedicated authenticated-vs-Guest product review requested by the user.

## Verification status

The changed repository files were re-read to verify component imports, state/event wiring, data relationships and branch targeting. A mounted local clone is not available in this connected environment, so local `npx tsc --noEmit`, `npm run build`, and `npm run dev` were not run and are not claimed as completed.

The branch has a GitHub Actions build workflow that triggers on pushes to `ravine/clean-rebuild` and runs `npm ci` plus `npm run build`.

No deployment was performed.

## Next execution gaps

1. Propagate the active Creator Identity into creator-specific queries, uploads, mutations, server actions and ownership/RLS decisions.
2. Apply and verify the staged ecosystem migration only on an explicitly safe development database, then wire Broadcast, Memberships, community gating, Exclusive Drops, Live Stage/Guest Queue, Spaces and Ratings end-to-end.
3. Build the actual Live/Space runtime rather than static concepts.
4. Review and then change Radio behavior/search.
5. Continue RLS/security auditing for creator roles, communities, memberships, circles, Live roles and messaging.

## Resume rules

Only `ravine/clean-rebuild` is the active application branch. Do not touch `main` or Production. Do not deploy without explicit approval. Never mark a feature complete from a commit message, frontend-only mock, local array or compilation result alone; verify actual wiring and runtime behavior.
