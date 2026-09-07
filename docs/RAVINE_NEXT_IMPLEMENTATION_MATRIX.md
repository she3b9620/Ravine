# RAVINE Next — Implementation Matrix

Status vocabulary:
- `IMPLEMENTED`: present in `ravine/clean-rebuild` and verified by code/live checks where noted.
- `FOUNDATION-STAGED`: domain/schema foundation exists in the repository but is not yet connected end-to-end.
- `PARTIAL`: meaningful pieces exist, but the complete user journey is not done.
- `OPEN`: requires an explicit product/technical decision before implementation.
- `PLANNED`: approved direction, not yet implemented.

## Competitive Pattern → RAVINE-native translation

| Pattern reference | RAVINE-native system | Current branch status | Next completion gate |
|---|---|---|---|
| YouTube | Creator Universe + Work Universe | PARTIAL | Complete Work-first Watch flow and Creator Universe navigation |
| TikTok | Cuts + Rising + short-form discovery | PARTIAL | Complete Cuts journey with explicit return to Work/Creator |
| Twitch/Kick | Live + Stage + Membership + Handoff | FOUNDATION-STAGED | Provider decision, live workflow, recording lifecycle |
| Discord | Community Channels + Roles + Creator Circle | PARTIAL / FOUNDATION-STAGED | Community permissions + channel/thread moderation |
| Telegram | Creator Broadcast + contextual Experiences | FOUNDATION-STAGED | Broadcast UI, visibility rules, archive links |
| WhatsApp | Communities + Broadcast + Events | PARTIAL / FOUNDATION-STAGED | Community/event lifecycle and permission matrix |
| Reddit | Topic Communities + contribution reputation | PARTIAL | Threads/voting/reputation integrity |
| Behance | Creator Identity + Credits | PARTIAL | Linked credit graph and creator portfolio depth |
| Pinterest / Are.na | Boards + Collections | FOUNDATION-STAGED | Public/private collection UI and work/creator/community linking |
| LinkedIn | Creator Passport + Opportunities | FOUNDATION-STAGED | Professional creator layer and opportunity workflow |
| Letterboxd / IMDb | Work Universe + Ratings + Reviews | FOUNDATION-STAGED | Work-specific rating dimensions and review UX |
| Patreon / Substack | Broadcast + Membership + Member Drops | FOUNDATION-STAGED | Membership access and creator controls |
| Product Hunt | Premiere + Launch Event | FOUNDATION-STAGED | Event object + launch/premiere lifecycle |
| Steam | Work/Game Hubs + Community contribution | PLANNED | Game hub architecture after core public/social loop |
| Strava | Community Challenges + Seasons | PLANNED | Challenge object and seasonal recognition |
| Notion / Figma | Project + Collaboration Space | FOUNDATION-STAGED | Project workspace, roles, versioning |
| GitHub | Build in Public + contribution signals | PLANNED | Project stages, contribution history, visibility controls |

## Core product systems

### Personal Universe
- Account identity: PARTIAL
- Preferences: PARTIAL
- Saved works / collections: FOUNDATION-STAGED
- Messages: IMPLEMENTED baseline
- Notifications: IMPLEMENTED baseline
- Taste graph: PLANNED

### Creator Universe
- Creator profile: PARTIAL
- Multiple Creator Identities: FOUNDATION / migration staged
- Works: PARTIAL
- Projects: FOUNDATION-STAGED
- Broadcast: FOUNDATION-STAGED
- Community: PARTIAL
- Memberships: FOUNDATION-STAGED
- Creator Circle: FOUNDATION-STAGED
- Opportunities: FOUNDATION-STAGED
- Analytics: PLANNED

### Work Universe
- Work/media core: PARTIAL around current `videos`
- Chapters/tracks/moments: FOUNDATION exists
- Credits graph: PARTIAL
- Ratings/reviews: FOUNDATION-STAGED
- Related works: PLANNED
- Premiere / Watch Party: FOUNDATION-STAGED

### Trust / Safety
- Supabase RLS: IMPLEMENTED baseline; continuous audit required
- Reports: IMPLEMENTED baseline
- Creator application: IMPLEMENTED baseline
- Moderation/admin: PARTIAL
- Appeals: PLANNED / policy still OPEN
- Rights/provenance: PLANNED
- Anti-abuse / manipulation intelligence: PLANNED
- AI security boundaries: PLANNED

### Discovery
- Search: PARTIAL and under active QA
- Trending/Rising/Hidden Gem/Featured/Select: PARTIAL
- Editorial selections: PARTIAL
- Taste Graph: PLANNED
- Recommendation engine: PLANNED
- Serendipity / Surprise Me / Quiet: PLANNED
- Why am I seeing this?: PLANNED

## Engineering gates before expanding scope

1. Re-verify the exact Git branch/SHA before edits.
2. Preserve Guest baseline and existing navigation.
3. Model explicit domain objects instead of overloading `videos` or `profiles`.
4. Define ownership + server authorization + RLS before exposing write paths.
5. Give every new surface loading, empty, error, responsive, accessibility, and reduced-motion states.
6. Verify Arabic/LTR/RTL and Light/Dark behavior for locale-sensitive UI.
7. Prefer root-cause fixes over layered CSS patches.
8. Keep OPEN decisions visibly OPEN.
9. Verify the complete user journey, not only the build.
10. Preview first; Production only by explicit founder approval.

## Current highest-priority execution order

### Phase 0 — Engineering Foundation
- Repository/route audit
- Domain model alignment
- Authorization boundary audit
- RLS verification
- test/evaluation foundation
- observability and error-state conventions

### Phase 1 — Public Core
- Discover
- Watch / Cinema Mode
- Creator Universe
- Work Universe
- Guest journey completion

### Phase 2 — Social Core
- Follow
- Messaging
- Notifications
- Collections

### Phase 3 — Communities
- Creator/topic communities
- channel/thread primitives
- roles/moderation

### Phase 4 — Creator Expansion
- Broadcast
- Projects
- Memberships
- Member Drops
- Creator Circle

### Later phases
Live → Discovery Intelligence → Trust/Rights → Economy → Ecosystem → Mobile.

The detailed Master Specs and RAVINE Next Master Vision remain authoritative. This matrix is an execution tracker, not a replacement for those documents.
