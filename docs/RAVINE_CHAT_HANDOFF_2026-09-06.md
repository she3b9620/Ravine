# RAVINE — Chat Handoff

Date: 2026-09-06
Status: ACTIVE / CONTINUE
Primary branch: `ravine/clean-rebuild`
Production/main: LOCKED

## 1. Resume Rule
Continue from the exact live state in this document. Do not restart the project or redesign existing approved UI. Re-verify the branch and deployment state before changing code.

Default execution mode is continuous: keep working through related subtasks without stopping for routine approvals. Stop only for a real blocker, a consequential/destructive action, a security/safety issue requiring a decision, or an Open Decision that genuinely needs founder input.

Founder workload goal: founder should primarily review results and make product decisions; routine investigation, coding, DB/RLS work, testing, deployment verification and documentation should be handled by the assistant where integrations permit.

## 2. Exact Current Git State
Latest commit on `ravine/clean-rebuild` at handoff:
`3c602916233813932bb45863a83b0c62e94b1820`

Latest commit message:
`fix: lock Hero intro typography across themes`

Recent relevant commit chain:
- `3c602916233813932bb45863a83b0c62e94b1820` — lock Hero intro typography across themes
- `0e039e8e60135bae523015319663b0a82570a348` — restore cinematic search glass in Light mode
- `df7ab8c95c86bc5d98b17c61024331a9c953ac43` — refine Hero volume slider interaction timing
- `54a20df32a7228525c951f89467cee0b4c34f067` — keep Hero volume control open briefly

These commits are on the active rebuild branch and should not be overwritten or rebased away casually.

## 3. Vercel State
Production is not approved for these changes and must remain untouched.

Vercel's last observed READY deployment was behind the current GitHub branch tip. Do not mistake the latest Vercel deployment for the latest code. The user explicitly wants the Preview to follow the current `ravine/clean-rebuild` GitHub state.

Before the next visual review, create/verify a Preview deployment from the exact current branch tip and report its URL. Never promote to Production without explicit approval.

## 4. Guest Experience — LOCKED
The current Guest Experience is a protected visual baseline.

Do NOT casually change:
- Guest layout/composition/hierarchy
- Hero structure
- Header
- Sidebar
- spacing/balance
- current animation/motion language
- page transitions
- typography
- Cinema feel
- Arabic/English typography behavior
- Dark/Light visual identity

Only make minimal targeted changes for verified bugs, accessibility, usability, security, performance, or functional correctness.

## 5. Identity — LOCKED FOUNDATION
Core RAVINE identity remains:
- Obsidian `#090909`
- Petrol Blue `#183F46`
- Mineral Copper `#C47A52`
- Warm Ivory `#F1E9DC`
- Stone `#9A9690`
- Burnt Umber `#70402F`
- Dusty Copper `#D49A78`

Arabic / Palestinian / Arab / Islamic identity remains foundational.

Egyptian/Pharaonic influence is an additive visual layer, especially in Dark Mode. It must complement rather than replace the established identity and should remain contemporary, cinematic and restrained. Proposed Egyptian supporting tones are not yet final hex locks.

## 6. Confirmed Hero / Guest Changes
Current approved direction includes:

### Hero intro text
Arabic:
`شاهد عيّنة من الأعمال، تعرّف على المبدعين، وافهم فكرة رَافِين قبل أن تسجّل. التفاعل الكامل يبدأ بعد إنشاء حسابك.`

English:
`Preview the work, meet the people behind it, and understand RAVINE before you sign up. Full interaction begins after account creation.`

The user explicitly requires identical typography geometry between Light and Dark and between Arabic/English as far as the existing locale typography system permits: no noticeable mode-switch change in font size, weight, line-height, spacing, wrapping or layout. Only color/theme treatment may differ.

### Hero heading
In Light Mode, the approved heading treatment is no white stroke. Use visible shadow + subtle white glow. Preserve existing typography and color.

### Hero guest kicker
Arabic:
`رَافِين / للضيوف`

English equivalent:
`RAVINE / FOR GUESTS`

The kicker should share the same shadow + subtle glow visual treatment as the Hero heading.

### Hero buttons
`أنشئ حسابك` and `استكشف الأعمال`

Light Mode should have clear button treatment comparable in visibility to Dark Mode while preserving the existing text colors and fonts.

### Hero volume control
User's exact intended behavior:
- Volume popover appears ABOVE the volume button, not below it.
- Vertical slider direction is bottom → top for increasing volume.
- Bottom = lower volume; moving upward = higher volume.
- Do not slow the normal Hero button/control animation.
- The volume control itself should remain available for a brief, small grace period after leaving the icon so the user can move onto the slider and interact with it.
- If pointer/focus enters the slider, it must remain open.
- Preserve the existing visual design; do not introduce unrelated animation changes.

## 7. Search Popup — Light Mode
The Light Mode search popup should visually behave like the Dark Mode version in terms of cinematic motion and layered depth:
- background is not a flat opaque color
- underlying page remains visually present
- use translucent glass/blur/saturation/layered treatment
- preserve the same reveal/hide animation language as Dark Mode
- keep the Light Mode treatment appropriate to the existing RAVINE identity

## 8. Creator Profiles
Do not fix only one creator page. Shared Creator Profile styling should make key creator text readable over its dark cinematic background in Light Mode, including:
- handle
- creator role/specialty
- profile bio/intro

Target visual treatment: light/ivory text with restrained supporting contrast, applied to the shared profile template for Arabic and English.

## 9. Hero Video Sources
Current external video support must remain.

Approved architecture direction for local raw videos:
- keep a dedicated local hero-video folder such as `public/videos/hero/`
- keep a separate video registry/config file
- allow local source references alongside external YouTube/embed URLs
- do not remove external video support
- raw videos may be added to the project repository in that dedicated folder

Do not upload or rewrite user-provided media without explicit need. Do not make a media-system refactor merely to add a folder; keep it isolated from current Guest behavior.

## 10. Security / Foundation Work Already Started
The engineering foundation audit has reviewed Supabase schema, RLS, privileged functions and exposed access patterns.

Important current direction:
- `has_work_access` was moved out of `public` into `private` to reduce exposed RPC surface while retaining its RLS helper role.
- `start_direct_conversation` should remain authenticated-only and must retain internal identity/permission validation.
- `admin_users` should not be made public merely to silence an advisor.
- Supabase security advisors should be rechecked after meaningful schema/security changes.
- Leaked Password Protection remains a dashboard-level item requiring separate configuration.

Do not blindly revoke function privileges without verifying actual callers and RLS dependencies.

## 11. Product Roadmap
Execution order remains:
1. Engineering Foundation / authorization audit / test foundation
2. Visual Lock without redesign
3. Public Product completion
4. Social + Community
5. Creator Platform / Studio
6. Media Infrastructure
7. Live + Podcast
8. Discovery Engine
9. RAVINE AI Intelligence Layer
10. Beta / Production Readiness

AI implementation should begin after the core platform has reliable data, permissions and media foundations. The AI Master Backlog is already documented in the Charter and includes multimodal Support, Safety, Rights, Community AI, Creator AI, Discovery AI, Taste Graph, Creator DNA, Work DNA, Trust, Governance, Red Team, Privacy and Evaluation.

## 12. AI Direction — LOCKED STRATEGIC BACKLOG
RAVINE AI is an Intelligence Layer, not disconnected chatbots.

Major systems:
- AI Gateway / Model Router
- Multimodal Support: Text / Voice / Image / Video / Screen Recording
- Content Safety
- Rights Intelligence
- Community AI
- Creator Advisor / Creator Copilot
- Work Intelligence / Work DNA
- Discovery Intelligence
- Taste Graph
- Creator DNA / Creative Genome
- Collaboration Intelligence
- Editorial / Curator Intelligence
- Trust & Risk Engine
- Human Moderation Copilot
- Appeals / Reports Intelligence
- Evidence Packs / Decision Replay
- Privacy / Data Minimization / Forgetfulness
- Governance / Evaluation / Red Team

AI must assist rather than replace creators, use least privilege, respect privacy, distinguish evidence from inference/recommendation, avoid artificial certainty, and use human oversight for sensitive decisions.

## 13. Design Preservation Priority
When a new feature conflicts with an approved existing visual behavior:
1. Preserve current Guest Experience.
2. Preserve approved typography.
3. Preserve approved motion/transitions/cinematic behavior.
4. Preserve core RAVINE palette and identity.
5. Add only what reinforces the system.
6. Prefer a targeted refinement over a redesign.

## 14. Backup / Continuity
When a milestone is explicitly accepted as satisfactory, create a recoverable Git snapshot only after explicit founder authorization and document:
- exact commit SHA
- date/time
- feature scope
- known limitations
- restoration/reference name

The historical Old RAVINE baseline remains preserved and must not be silently rewritten.

## 15. Immediate Next Action
On the next chat:
1. Re-verify `ravine/clean-rebuild` and confirm the exact latest SHA.
2. Create/verify a Vercel Preview from that exact SHA.
3. Give the user the live Preview URL.
4. Continue the Engineering Foundation / authorization audit without touching the protected Guest design unless a real bug requires it.
5. Do not stop after a single small task; continue through related safe subtasks.

## 16. Ready-to-Paste Resume Message

Continue RAVINE from `docs/RAVINE_CHAT_HANDOFF_2026-09-06.md` on branch `ravine/clean-rebuild`. Re-verify the live branch tip first. Do not restart or redesign the project. Guest Experience, Hero, Header, Sidebar, typography, animation, transitions, Cinema feel, Arabic/English system and identity are LOCKED and must be preserved. The latest GitHub commit recorded at handoff is `3c602916233813932bb45863a83b0c62e94b1820`, but verify it before editing. The user wants the Preview to reflect the exact latest GitHub state, not an older Vercel deployment. Create/verify that Preview, then continue the Engineering Foundation/security audit and related work continuously without stopping for routine approvals. Preserve all Hero volume/search/creator-profile changes documented above. Production/main remains LOCKED.
