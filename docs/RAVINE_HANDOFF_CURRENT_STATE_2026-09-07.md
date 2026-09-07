# RAVINE — Current Execution Handoff

Date: 2026-09-07
Repository: `she3b9620/Ravine`
Working branch: `ravine/clean-rebuild`
Production/main: untouched; do not modify.
Deployment: none performed in this execution.

## 1. Branch state

The implementation work in this continuation was performed only against `ravine/clean-rebuild`.

Pre-handoff implementation tip before this document update:

`1c54e3dc3460e516942ffaba1ffe76f590a02d9b`

The commit created by this handoff update follows the implementation tip above.

## 2. Current verified implementation facts

### Home Welcome

`components/HomeWelcomeMotion.tsx` is actively mounted through the shared locale layout and targets authenticated Home. The implementation has a real 3000ms hold followed by settling and settled states. Logout clears `ravine-home-welcome-completed-v5`, allowing a later login to start the Welcome lifecycle again.

The Home experience CSS keeps the profile/image card visible through settling and final state with a gentler reduction than the earlier implementation.

### Sidebar

`components/SidebarNav.tsx` renders navigation options through `.ravine-sidebar-scroll-content` inside `.ravine-sidebar`.

The actual sidebar remains anchored at `78px` below the header. `app/[locale]/ravine-sidebar.css` now gives the sidebar an opaque solid surface and disables its backdrop blur. Only the internal navigation content receives `padding-top: 38px` on desktop; the sidebar itself is not repositioned or resized.

The former `app/[locale]/ravine-shell-overlap.css` position override was removed and replaced with an intentional no-op so it can no longer move the sidebar to the top of the viewport.

### Search

`components/SearchLauncher.tsx` has real open/closing state, Escape handling, filter state, submit routing, and `SearchResultsPanel` wiring.

`components/SearchResultsPanel.tsx` now updates search results with an 80ms debounce for typed queries and an AbortController so stale responses cannot overwrite newer queries. This is still a real `/api/search` request, not local filtering.

The Search popup's empty discovery model no longer contains the phrase `مساحة للاكتشاف، مش مجرد بحث.` or its English counterpart.

Result cards now render content type and quality as separate badges so the metadata no longer collides with the title/description.

The primary Search CTA now opens the full filtered result set in Discover, while typing remains the live-preview mechanism.

### Light Mode Search motion

`app/[locale]/ravine-search-light-motion-fix.css` no longer disables the Light Mode Search overlay animation. It restores real Light Mode in/out motion and gives the dialog a true directional closing animation using `ravineSearchDialogOut`.

The overlay still uses the existing glass animation source from `ravine-search-glass.css`; the Light Mode fix now preserves that animated path instead of replacing it with a static layer.

### Discover / Explore

`app/[locale]/discover/page.tsx` now explicitly imports both `discover-enhancements.module.css` and the new `discover-card-hierarchy.module.css`.

The prior Discover enhancement stylesheet had existed but was not wired into the page. This import restores the intended search/filter/button presentation without introducing a Home-wide global style.

The Discover result cards also use separate `.video-type` and `.video-quality` badges, scoped to `.discover-page` only.

### Language selector

`components/LanguageSwitcher.tsx` now controls the native `<details>` open state from React and registers a document-level `pointerdown` outside listener. Clicking outside the menu closes it; interaction inside remains open. Selecting another language closes it before navigation.

The visual language selector CSS was not redesigned.

### Guest Home About-section ordering

The Guest Home About section is still the exact existing content. The defect source was `syncGuestAbout()` in `components/RavineUiEnhancer.tsx`, which previously used `appendChild()` and could leave the section in the wrong visual order after navigation/rerender.

The function now finds `.home-guest-hero` and explicitly inserts/repositions `.ravine-guest-about` immediately after the Hero. Duplicate injected sections are removed. The MutationObserver continues to keep the order stable during client navigation/rerender.

No Hero text, video, content, or About copy was changed.

### Discovery idea numbers

`app/[locale]/home-enhancements.module.css` now increases the first numeric span in each pathway card from the previous tiny treatment to a clearer, slightly larger 15px presentation. The title, body copy, card dimensions, and spacing were not redesigned.

## 3. Deliberately not changed in this continuation

- Radio behavior and search implementation. Radio remains deferred for a dedicated logged-in vs guest review.
- Guest YouTube provider behavior beyond the existing end-state implementation.
- Chat/Messaging architecture because the actual required popup/inbox/search/send/realtime/localization/permissions wiring was already present in source.
- Creator payment provider, pricing, and revenue-share details, which remain OPEN.
- Production/main and any deployment.

## 4. Product direction now recorded

A separate product/source-of-truth document was added:

`docs/RAVINE_PRODUCT_ECOSYSTEM_BLUEPRINT_2026-09-07.md`

It records the agreed RAVINE direction for:

- Personal Account -> multiple Creator Identities, with Personal Mode vs Creator Mode.
- Creator Universe.
- Creator Broadcast.
- Public Creator Community.
- Members-only Community.
- Creator Circle for private creator-to-creator groups.
- Topic Communities.
- Membership tiers and Exclusive Drops.
- Projects.
- Ratings/Reviews and a future trust-aware RAVINE Score.
- RAVINE Live Universe including Co-Live, Guest Live, Stage roles, Guest Queue, Sessions and post-Live derivatives.
- RAVINE Spaces including audio/video/hybrid and debate/panel modes.
- Gaming ecosystem concepts inspired by Twitch/Kick without cloning them.
- Watch Parties.
- Collections and Idea Boards.
- Creator Shows and Events.
- Creator Opportunities, future Marketplace, and delegated Creator Teams.
- RAVINE Spotlight / Rising Creators and external creator identity linking.
- AI / RAVINE Intelligence as moderation, discovery, creator assistance, live assistance and trust infrastructure.

These are product requirements/directions, not claims of implementation.

## 5. Verification status

The branch files were re-read after the implementation changes to confirm that the modified components are actually imported/used and that the requested behavior is represented in state/event/wiring rather than only in commit names.

Local `npx tsc --noEmit`, `npm run build`, and `npm run dev` could not be executed from this connected GitHub environment because there is no mounted local working tree. Therefore they are not represented as completed verification.

No deployment was performed.

## 6. Required local verification command

Use PowerShell from the real local clone:

```powershell
git fetch origin
git checkout ravine/clean-rebuild
git pull --ff-only origin ravine/clean-rebuild
if ($LASTEXITCODE -ne 0) { throw "git pull failed" }

$branch = git rev-parse --abbrev-ref HEAD
$local = git rev-parse HEAD
$remote = git rev-parse origin/ravine/clean-rebuild
Write-Host "Branch: $branch"
Write-Host "Local : $local"
Write-Host "Remote: $remote"
if ($branch -ne "ravine/clean-rebuild") { throw "Wrong branch." }
if ($local -ne $remote) { throw "Local and remote branch are not synchronized." }

npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "TypeScript verification failed" }

npm run build
if ($LASTEXITCODE -ne 0) { throw "Next.js build failed" }

npm run dev
```

Do not run any deployment command as part of verification.

## 7. Next known gaps

1. Radio: replace the local two-track search with a genuine in-platform song/artist search path after the logged-in/guest Radio behavior is reviewed and the server-side YouTube Data API credential/configuration path is verified.
2. Creator Community + Membership: implement only after auditing the real Supabase schema, ownership, memberships, access rules, and RLS.
3. Multi-Identity architecture: design the Personal Account -> Creator Identity ownership model at the database/auth level before building the UI switcher.
4. Continue security/permission audit across server routes, server actions, ownership checks, RLS, creator permissions, community roles and messaging.

## 8. Resume rule

Always read the actual `ravine/clean-rebuild` HEAD before editing. Never touch `main`/Production. Never deploy without explicit approval. Never mark a feature complete from a commit message, frontend-only mock, or compilation result alone; verify the actual wiring and runtime behavior.
