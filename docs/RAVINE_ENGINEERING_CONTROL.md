# RAVINE — Engineering Control & Delivery Plan

Status: ACTIVE
Branch: `ravine/clean-rebuild`
Production: LOCKED

## 1. Non-Negotiable Product Preservation

- The current Guest Experience is a protected design baseline.
- Do not redesign Guest UI, composition, hierarchy, Hero, Header, Sidebar, spacing, or visual structure unless a change is necessary for a verified bug, security issue, accessibility issue, usability blocker, or equivalent technical necessity.
- Preserve all founder-approved Motion, Animation, Transitions, Typography, Cinema Mode behavior, RTL/LTR behavior, and visual identity.
- Improvements must be preservation-first and minimally invasive.
- Never use AI architecture as a reason to redesign the existing Guest interface.
- Never silently change a LOCKED product/design decision.

## 2. Identity Preservation

RAVINE identity remains the primary visual system:

- Obsidian `#090909`
- Petrol Blue `#183F46`
- Mineral Copper `#C47A52`
- Warm Ivory `#F1E9DC`
- Stone `#9A9690`
- Burnt Umber `#70402F`
- Dusty Copper `#D49A78`

Arabic/Palestinian/Arab/Islamic identity remains foundational. A complementary Egyptian/Pharaonic visual layer may be introduced carefully, with its strongest expression reserved for Dark Mode. It must support, not replace, the existing identity.

Proposed Egyptian palette additions remain controlled and must not become a redesign of the current Guest experience.

## 3. Engineering Workflow

`Audit → Plan → Implement → Local Verify → Automated Verify → GitHub Preview → Verify Again → Document`

- Primary development branch: `ravine/clean-rebuild`
- Never modify `main` casually.
- Never promote to Production without explicit founder approval.
- Prefer local verification before Vercel Preview.
- Avoid rapid-fire deployments when rate limits are present.
- Preserve UTF-8 Arabic/English content.

## 4. Quality Gate

A feature is not Done because its page renders. Where applicable, completion requires:

- UI implementation
- behavior
- data path
- authorization
- loading state
- empty state
- error state
- mobile behavior
- responsive behavior
- RTL/LTR correctness
- accessibility
- security consideration
- automated tests
- build/lint verification
- preservation of existing features
- alignment with the Master Spec

## 5. Security / Authorization Gate

Every protected area and sensitive operation must have an explicit role and ownership rule.

Roles to reason about:

- Guest
- Authenticated Viewer
- Creator Applicant
- Approved Creator
- Moderator
- Admin / Platform Operator where applicable

Authorization must be enforced at route, server action/API, database/RLS, and ownership layers. UI hiding is not sufficient security.

## 6. QA Strategy

Priority testing layers:

1. Critical user journeys with browser automation.
2. Visual regression for protected/shared UI components.
3. Accessibility/performance checks.
4. Runtime error monitoring before Beta.
5. Product analytics after meaningful real-user usage exists.

Preferred tooling direction:

- Playwright for E2E/browser verification.
- Storybook + visual testing for reusable visual components where useful.
- Lighthouse for performance/accessibility gates.
- Sentry before Beta for runtime visibility.
- PostHog after real-user validation for product analytics.

No tool should be introduced unless it reduces risk or workload enough to justify its maintenance cost.

## 7. Delivery Phases

### Phase A — Engineering Foundation

- Complete route inventory.
- Complete API/server-action inventory.
- Complete role/permission matrix.
- Ownership checks.
- Supabase RLS/API exposure review.
- Auth/session edge-case review.
- Error/loading/empty-state inventory.
- Establish automated verification foundations.

### Phase B — Visual Lock

- Preserve current Guest design.
- Verify Typography.
- Verify Motion/Transitions.
- Verify Hero/Header/Sidebar.
- Verify Cinema Mode.
- Verify Arabic/English.
- Verify Dark/Light modes.
- Verify mobile/responsive behavior.
- Only make minimal necessary fixes.

### Phase C — Public Product Completion

- Home
- Discover
- Search
- Watch
- Creator profiles
- Creators directory
- Cuts
- RAVINE Select
- Collections

### Phase D — Social + Community

- Follow
- Like
- Save
- Share
- Comments
- Notifications
- Community
- Creator communities
- Reports
- Moderation foundations

### Phase E — Creator Platform

- Create
- Upload
- Drafts
- Processing
- Publishing lifecycle
- Studio
- Playlists
- Series/Seasons
- Podcasts
- Analytics
- Profile management
- Creator qualification/progression

### Phase F — Media Infrastructure

- Cloudinary integration
- Upload pipeline
- Processing lifecycle
- Thumbnail/transformation pipeline
- Metadata
- Playback reliability
- Failure/retry states
- Publish readiness
- Audio/subtitle/transcript foundations

### Phase G — Live + Podcast

- Event-centric Live model
- Provider integration
- Scheduling
- Countdown
- Reminders
- Chat
- Co-hosts
- Moderation
- Recording
- VOD conversion
- Podcast intelligence foundations

### Phase H — Discovery Engine

- Search ranking
- Trending
- Rising Creators
- Hidden Gems
- Similar Work
- Similar Creator
- Collections
- Context-aware recommendations
- Editorial signals

### Phase I — RAVINE Intelligence Layer

Build after the core platform has reliable data and permissions.

Core:
- AI Gateway
- Model Router
- Multimodal orchestration
- Permission-aware tools
- Policy Engine
- Confidence/Risk/Reason Codes
- Auditability
- Memory controls
- Human escalation
- Evaluation

Systems:
- Multimodal Support (Text / Voice / Image / Video / Screen Recording)
- Content Safety AI
- Rights Intelligence
- Community AI
- Creator Advisor
- Work Intelligence
- Discovery Intelligence
- Taste Graph
- Creator DNA / Creative Genome
- Collaboration Intelligence
- Editorial/Curator Intelligence
- Trust & Risk Engine
- AI Governance
- Red Team
- Privacy/Data Minimization
- AI Evaluation/Experimentation

### Phase J — Beta / Production Readiness

- Full security review.
- Full accessibility review.
- Arabic/English QA.
- Mobile QA.
- Performance QA.
- Runtime monitoring.
- Product analytics.
- Moderation readiness.
- Recovery/reliability checks.
- Legal/policy review where needed.
- Final Beta scope.
- Production checklist.

## 8. AI Principle

RAVINE AI is an Intelligence Layer, not a collection of disconnected chatbots.

AI must:

- assist rather than replace creators;
- avoid artificial certainty;
- use the least data necessary;
- respect role and ownership boundaries;
- use human review for sensitive/high-impact decisions;
- distinguish evidence, inference, and recommendation;
- remain observable and auditable.

## 9. Founder Workload Reduction

The default operating model is:

Founder: product intent, approval of major new decisions, final acceptance.

AI/Engineering agent: audit, architecture, code changes, database/RLS work, testing, preview verification, diagnosis, documentation, and progress reporting.

Do not shift routine implementation work back to the founder unless an unavailable external credential/action makes it unavoidable.

## 10. Current Position

The current `ravine/clean-rebuild` branch contains a substantial working foundation, including the cinematic shell, localization foundations, account/auth areas, public product surfaces, creator foundations, motion work, and recent route protection improvements.

The largest remaining work is completing the product as a production-grade platform: comprehensive authorization, visual QA without redesign, creator publishing lifecycle, media pipeline, social/community completion, Live/Podcast integration, discovery sophistication, and then the RAVINE AI layer.

The current Vercel Preview linked to `ravine/clean-rebuild` is the preferred deployment verification surface; Production remains untouched unless explicitly approved.
