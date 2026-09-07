# RAVINE — Creator Ecosystem Blueprint

Date: 2026-09-07
Status: PRODUCT REQUIREMENTS / ARCHITECTURE DIRECTION
Branch: `ravine/clean-rebuild`

This document records the expanded RAVINE direction agreed during the 2026-09-07 planning session. It is a product/source-of-truth extension, not a claim that all of these systems are already implemented.

## 1. Identity Architecture

### Personal Account
The email-authenticated account represents the real person and can behave as a normal RAVINE user: browsing, following, saving, rating, messaging, joining communities, attending Lives/Spaces, and managing personal settings.

### Creator Identities
One Personal Account may own multiple independent Creator Identities, conceptually closer to a Facebook Profile -> Pages model than to forcing a separate login per channel.

Each Creator Identity can have its own name, handle, avatar, bio, works, followers, analytics, community presence, Broadcast, Members, Live presence, and settings.

The user can switch between Personal Mode and any owned Creator Identity without signing out. Actions that are creator-specific must be attributed to the active Creator Identity, while the Personal Account remains the ownership and authentication root.

RAVINE may later support delegated team access to Creator Identities without transferring personal-account ownership.

## 2. Creator Universe

A Creator Identity is more than a profile page. It is a connected Creator Universe containing:

- Home / profile context
- Works and Projects
- Broadcast
- Public Community
- Members Community
- Membership tiers
- Exclusive Drops
- Live
- Spaces
- Events
- Collections
- Creator Circle
- Collaboration surfaces

The aim is to let audiences follow the creator's world, not only isolated uploads.

## 3. Broadcast

Every Creator Identity may have a RAVINE Broadcast channel.

Supported directions:
- Public
- Followers
- Members
- Invite-only

Broadcast messages may support text, images, video, voice notes, links, polls, questions, Live announcements, project launches, BTS updates, and other lightweight creator updates.

Broadcast is intentionally different from Community: Broadcast is primarily creator-to-audience communication; Community is the discussion space around the creator.

## 4. Creator Communities

### Public Creator Community
Each Creator Identity may own one public community with creator-controlled join policy:
- Open
- Approval required
- Followers only
- Invitation only
- Restricted / read-only modes

The creator and moderators should be able to establish channels, pinned information, threads, polls, voice rooms, rules, moderation, and member controls.

### Members Community
A separate private community is available to eligible Members. Access is gated by membership status/tier and can include member-only channels, Live/Space access, BTS, project discussions, and private events.

### Creator Circle
A third community category is for invited creators or trusted peers. It is private and separate from fan/community membership.

Creator Circle can contain private chat, voice/video rooms, project collaboration, shared notes/files, ideas, feedback, and co-hosting preparation.

## 5. Memberships and Exclusive Drops

Membership remains an official Monetization architecture component.

Creators may define multiple tiers. The exact pricing, payment provider, taxes, payout model, and revenue share remain OPEN until separately approved.

Benefits can include:
- Members Community access
- Private Broadcast
- Members-only Lives/Spaces
- Early access
- Behind-the-scenes material
- Extended cuts
- Scripts, concepts, drafts, or notes
- Exclusive Projects
- Special events

### Exclusive Drops
A creator can explicitly gate individual works, assets, episodes, ideas, or events by:
- Public
- Followers
- Members
- Specific membership tier
- Invite-only

The creator controls the decision for each Drop.

## 6. General RAVINE Communities

Communities are not limited to creators. RAVINE also needs topic/interest communities such as filmmaking, photography, gaming, editing, AI, design, writing, football, music, and other verticals.

Community surfaces can support:
- Feed
- Text channels
- Media channels
- Forums / threads
- Voice rooms
- Events
- Polls
- Roles
- Moderation
- Rules
- Discovery

## 7. Projects

A creative work should be able to become a Project rather than only a single video.

A Project can group:
- Main work
- Trailer
- Stills
- BTS
- Concept art
- Credits
- Soundtrack
- Related posts
- Discussion
- Reviews
- Awards
- Episodes / Seasons

This supports cinematic, documentary, podcast, photography, design, gaming and other creative formats.

## 8. RAVINE Ratings

Creative works need a first-class Ratings and Reviews system inspired by IMDb and other established review products, while using RAVINE-specific anti-abuse rules.

Possible components:
- Audience rating
- Written reviews
- Critic / expert signals where verified
- Work-level aggregate score
- Review counts
- Trust-aware weighting
- Anti-brigading / suspicious-rating detection

Ratings must remain centered on the work. Creator reputation is a separate concept and must not collapse into one simplistic number.

## 9. RAVINE Live Universe

Live is a first-class product layer, not just a video upload mode.

Core types:
- Solo Live
- Co-Live
- Guest Live
- Live Room
- Audio/Video Space
- Hybrid Space
- Watch Party
- Premiere
- Workshop
- Podcast
- Gaming Live

### RAVINE Stage
Live roles may include:
- Host
- Co-host
- Guest
- Speaker
- Producer
- Audience

The host controls role changes, invites, removals, moderation and permissions.

### Guest System
Guest entry should support:
- Guest requests
- Guest queue
- Host approval
- Trust-aware participant controls
- Session modes such as Interview, Debate, Review, React, Teach, Challenge, Co-create

The guest system is intended to go beyond a simple multi-box video layout.

## 10. RAVINE Sessions

A Live can persist as a Session object after ending.

Potential derivatives:
- Full recording
- Chapters
- Highlights
- Clips
- Quotes
- Questions and answers
- Related Projects
- Community discussion
- Guest list

This creates a Live -> Session -> Content -> Community loop.

## 11. RAVINE Spaces

Spaces are audio/video/hybrid rooms inspired by Clubhouse and X-style live conversations but organized around RAVINE's creator/community context.

Modes may include:
- Open discussion
- Creator panel
- Debate
- Industry room
- Idea room
- Gaming room
- Workshop

Spaces can be scheduled, live, recorded, and archived as episodes/sessions.

## 12. Gaming Layer

RAVINE should support a gaming creator ecosystem without becoming a Twitch clone.

Potential surfaces:
- Gaming Live
- Clips
- Game hubs
- Gaming communities
- Voice rooms
- Watch parties
- Esports/events
- Co-streaming
- Creator squads
- Stream overlays
- Handoff between Lives

A future RAVINE gaming layer may include streamer-specific collaboration rooms and creator circles.

## 13. Watch Parties

A Watch Party combines synchronized viewing with social context:
- Video/live/premiere
- Voice
- Text chat
- Reactions
- Polls
- Notes
- Rating
- Discussion

After the event, the watch session can feed directly into Ratings and Community discussion.

## 14. Collections and Idea Boards

RAVINE should support user and creator Collections similar in spirit to Pinterest boards and YouTube playlists.

Collections may contain works, projects, posts, creators, communities and events.

Idea Boards / Moodboards may contain images, videos, references, notes, color palettes, music references and private planning materials.

Visibility can be:
- Private
- Team
- Members
- Public

## 15. Creator Shows and Events

Creators can build recurring shows with episodes, guests, community context, and archive pages.

Events may combine Live, Space, Premiere, Community, Broadcast, reminders, and post-event discussion.

## 16. Collaboration and Opportunities

RAVINE should eventually support creator-to-creator opportunity discovery:
- Collaborations
- Editing work
- Photography
- Casting
- Design
- Music
- Production
- Freelance work
- Brand opportunities

A future Marketplace may support creator services and digital assets, while keeping the core product focused on creative work and community.

## 17. Creator Promotion

RAVINE should be able to promote and discover external creators, including established YouTubers and TikTokers, without pretending their external content is native when it is not.

Potential program:

### RAVINE Spotlight / Rising Creators

Creators may connect external identities and, where verified, receive:
- Creator profile
- Spotlight opportunities
- Featured Projects
- Interviews
- Discovery placement
- Community presence

Promotion must use moderation and transparency. Paid promotion, eligibility, targeting, and ranking rules remain future product decisions.

## 18. External Identity Linking

Creators may connect external profiles such as YouTube, TikTok, Instagram, X, Twitch, Behance, and personal portfolios.

RAVINE may import metadata or display external references where platform terms allow. It must not falsely imply ownership or native hosting of third-party content.

## 19. Messaging

Personal messaging and creator/community communication should remain distinct by context while sharing one underlying messaging architecture where possible.

Potential modes:
- Personal DM
- Group chat
- Creator chat
- Community chat
- Creator Circle chat
- Voice/video
- Files
- Replies
- Reactions
- Threads
- Polls
- Events

The active identity model must be respected so users can clearly see whether a message is sent as their Personal Account or as a Creator Identity.

## 20. AI / RAVINE Intelligence

AI should be integrated as infrastructure rather than a decorative chatbot.

Possible responsibilities:
- Creator assistant
- Discovery and recommendation
- Community moderation
- Spam/scam detection
- Safety classification
- Copyright-risk signals
- Live moderation
- Live producer assistance
- Highlight/clip detection
- Question clustering
- Summaries
- Creator collaboration matching
- Community matching
- Suspicious ratings / engagement detection

Any high-impact enforcement should retain human review and clear policy boundaries where appropriate.

## 21. Retention Loop

The intended product loop is:

Work -> Creator -> Creator Universe -> Broadcast -> Community -> Live/Space -> Project -> Rating -> Membership -> Creator discovery -> Collaboration -> New Work

The goal is not to trap users through unrelated features. The goal is to make the entire creative journey coherent inside RAVINE.

## 22. Non-Goals / Guardrails

RAVINE should not become a direct clone of any single platform.

The following remain explicit design principles:
- Preserve RAVINE's cinematic identity.
- Keep the main UI simple even when the underlying platform is powerful.
- Separate Personal Account from Creator Identity.
- Separate Broadcast from Community.
- Separate Public Community, Members Community, and Creator Circle.
- Keep payment/provider/revenue-share decisions OPEN until approved.
- Use real backend/data ownership rules for creator identities, memberships, communities, roles and permissions.
- Protect Discover from unrelated global Home CSS changes.
- Never treat a UI mock, local array, or frontend-only state as a completed backend capability.

## 23. Implementation Status

This document records agreed product direction only.

It does NOT mean the following are already implemented:
- Multi-Creator Identity architecture
- Broadcast channels
- Members Communities
- Creator Circles
- Tiered Memberships
- Exclusive Drops
- RAVINE Spotlight
- RAVINE Live Universe
- RAVINE Spaces
- Gaming layer
- Advanced Ratings / Reputation
- Creator Teams / delegated permissions
- Creator Marketplace

These systems should be implemented incrementally after the current UI/security foundation and actual Supabase schema are audited.
