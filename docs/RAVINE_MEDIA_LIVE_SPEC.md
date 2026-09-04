# RAVINE Media & Live System Specification

Status: PROPOSED implementation architecture grounded in the RAVINE Master Spec and current product decisions.

## 1. Content Types

- Short: first-class independent short content; may optionally link to a full work.
- Video: standard long-form video.
- Film: cinematic long-form work.
- Documentary: first-class documentary experience with story/context-oriented metadata.
- Podcast: first-class audio-first or video podcast.
- Live: live event family with specialized formats.

## 2. Short Relationship Model

A Short may be:

- Independent: no parent work.
- Linked: related to a full Work and capable of routing directly to it.

Linked Shorts may act as teaser, highlight, hook, quote, scene, or behind-the-scenes discovery assets.

A Short remains its own content object with its own engagement and analytics even when linked to a Work.

## 3. Work Preview / Trailer

Trailer/Preview is optional and belongs to the Work as an associated media asset, not as a separate Work by default.

- Documentary / Film / Podcast: optional Trailer.
- Video: optional Preview, intended as a short teaser and proposed maximum of 30 seconds.
- Short: no required trailer.
- The viewer can choose to watch the trailer/preview or open the main Work directly.
- Trailer/Preview playback does not replace or corrupt the main Work watch progress.

## 4. Visibility & Audience

Work visibility values:

- public
- followers
- unlisted
- private
- custom

Separate discovery controls may govern whether an accessible Work appears in profile/search/discovery surfaces.

Custom access is represented by work-level user grants. Detailed member/group access rules remain open for later product policy.

## 5. Localization

A Work may have:

- original language
- subtitle tracks
- audio/dubbing tracks
- transcript tracks
- translated metadata

AI dubbing, where introduced, must be labeled distinctly from original human/creator audio.

## 6. Chapters & Moments

Chapters are named time ranges/points used to divide the timeline into meaningful sections.

Moments are notable time points/ranges such as quotes, scenes, answers, key details, or discoveries.

Both are associated with the Work and can drive navigation, transcript alignment, and future analytics/discovery features.

## 7. Player Architecture

One shared player engine with specialized experiences:

- Short Player
- Cinema / Video Player
- Film Player
- Documentary Player
- Podcast Player
- Live Player

Shared services include playback state, captions, audio tracks, accessibility, quality selection, analytics, and keyboard controls.

The UI exposes only controls meaningful for the current content type.

### Core capabilities where supported

- play/pause
- seek backward/forward
- timeline
- volume/mute
- quality/auto quality
- playback speed
- subtitles/captions
- audio tracks / dubbing
- transcript
- chapters
- fullscreen
- theater/cinema mode
- picture-in-picture
- share
- save
- keyboard accessibility
- reduced-motion behavior
- playback position memory
- previous/next work where a collection context exists
- queue where meaningful
- recently watched / continue watching integration

## 8. Documentary Experience

Documentary is a first-class format. In addition to the player it may expose:

- trailer
- chapters
- story/context
- people
- locations
- references/sources where applicable
- transcript
- credits
- related works

## 9. Podcast Experience

Podcast is first-class and may be audio-only or video.

Key capabilities:

- audio-first playback
- trailer
- chapter navigation
- transcript
- queue
- playback speed
- sleep timer
- skip controls
- continue listening
- waveform/visualizer when appropriate
- related episodes and creators

No unexpected autoplay sound.

## 10. Navigation & Continuation

Playback state should support:

- continue watching/listening
- exact resume position
- chapter-aware resume labels
- recent history
- previous/next episode or work in a Series/Playlist
- queue management where meaningful
- mini-player where compatible with the surrounding surface

## 11. Live Formats

Supported conceptual formats:

- Video Live
- Audio Live
- Camera-Off Live
- RAVINE Premiere
- Behind the Scenes
- Creator Q&A
- Workshop / Masterclass
- RAVINE Sessions
- Watch Party

Live architecture uses Host + Guests + Audience.

## 12. Live Participation

Viewer capabilities may include:

- watch
- chat/react
- Raise Hand / Request Guest access when enabled
- enter an approved guest/speaker state

Guest modes:

- video
- audio
- camera-off/avatar

Dynamic stage layouts should respond to live type and participant count.

## 13. Live Roles

- Owner / Host
- Co-host
- Guest
- Audience
- Account Moderator
- Live-only Moderator

Moderators may receive limited permissions for chat, participants, guest requests, stage controls, mute/remove/ban, slow mode, and similar functions according to assigned permissions.

A Live-only Moderator may be scoped to a single event without receiving broader creator-account access.

## 14. Creator Team

Initial role vocabulary:

- studio_manager
- content_manager
- community_manager
- moderator
- live_manager
- live_moderator
- analyst
- localization_manager
- custom

The Owner retains ultimate account-level control. Roles should be permission-based rather than implicitly full-admin.

## 15. Promotion

RAVINE Promote is a distinct distribution/promotion layer for:

- Works
- Shorts
- Podcasts
- Documentaries
- Films
- Series
- Live events

Promotion must remain distinguishable from Featured and RAVINE Select editorial states.

Promotion analytics should distinguish organic and promoted discovery.

Exact prices, payment provider, revenue share, and monetization rules remain OPEN.

## 16. Architecture Constraints

- Supabase remains the system of record for metadata, permissions, relationships, analytics, moderation state, and business rules.
- Cloudinary remains the agreed large-media processing/delivery layer; exact production configuration remains OPEN.
- Exact Live provider/architecture remains OPEN.
- Do not hard-code unresolved Master Spec decisions as final policy.
- Do not allow visibility UI to bypass RLS.
- Do not make Creator status automatic because of upload activity.
- Do not make Shorts exclusively linked to long-form works.
- Do not treat Promoted, Featured, and RAVINE Select as equivalent.
