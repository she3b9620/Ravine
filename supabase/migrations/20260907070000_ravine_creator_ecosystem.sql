-- RAVINE Creator Ecosystem foundation.
-- Staged in the application repository; not applied to the connected Supabase project in this execution.

-- creators already acts as the Creator Identity record. Keep it intentionally one-to-many from auth.users.
create index if not exists creators_user_id_idx on public.creators(user_id);

alter table public.communities
  add column if not exists creator_id bigint references public.creators(id) on delete cascade,
  add column if not exists community_kind text not null default 'general',
  add column if not exists join_policy text not null default 'open';

alter table public.communities
  drop constraint if exists communities_community_kind_check;
alter table public.communities
  add constraint communities_community_kind_check check (community_kind in ('general','creator_public','creator_members','creator_circle','topic','platform'));
alter table public.communities
  drop constraint if exists communities_join_policy_check;
alter table public.communities
  add constraint communities_join_policy_check check (join_policy in ('open','approval','followers','members','invite_only','restricted'));
create index if not exists communities_creator_id_idx on public.communities(creator_id);

create table if not exists public.creator_membership_tiers (
  id uuid primary key default gen_random_uuid(),
  creator_id bigint not null references public.creators(id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  description_en text,
  description_ar text,
  price numeric(12,2) not null default 0 check (price >= 0),
  currency text not null default 'USD',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, name_en)
);
create index if not exists creator_membership_tiers_creator_idx on public.creator_membership_tiers(creator_id, sort_order);

create table if not exists public.creator_memberships (
  id uuid primary key default gen_random_uuid(),
  creator_id bigint not null references public.creators(id) on delete cascade,
  tier_id uuid not null references public.creator_membership_tiers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','paused','cancelled','expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (creator_id, user_id)
);
create index if not exists creator_memberships_user_idx on public.creator_memberships(user_id);
create index if not exists creator_memberships_tier_idx on public.creator_memberships(tier_id);

create table if not exists public.creator_broadcasts (
  id uuid primary key default gen_random_uuid(),
  creator_id bigint not null references public.creators(id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  access_policy text not null default 'followers' check (access_policy in ('public','followers','members','invite_only')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id)
);

create table if not exists public.creator_broadcast_messages (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.creator_broadcasts(id) on delete cascade,
  author_creator_id bigint not null references public.creators(id) on delete cascade,
  message_type text not null default 'text' check (message_type in ('text','image','video','audio','poll','link','announcement')),
  body text,
  media_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists creator_broadcast_messages_idx on public.creator_broadcast_messages(broadcast_id, created_at desc);

create table if not exists public.creator_circles (
  id uuid primary key default gen_random_uuid(),
  owner_creator_id bigint not null references public.creators(id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  description_en text,
  description_ar text,
  privacy text not null default 'private' check (privacy = any (array['private','invite_only'])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.creator_circle_members (
  circle_id uuid not null references public.creator_circles(id) on delete cascade,
  creator_id bigint not null references public.creators(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  status text not null default 'active' check (status in ('active','pending','removed')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, creator_id)
);

create table if not exists public.work_access_policies (
  work_id bigint primary key references public.videos(id) on delete cascade,
  access_type text not null default 'public' check (access_type in ('public','followers','members','tier','invite_only')),
  membership_tier_id uuid references public.creator_membership_tiers(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists work_access_policies_tier_idx on public.work_access_policies(membership_tier_id);

create table if not exists public.live_events (
  id bigint generated by default as identity primary key,
  creator_id bigint not null references public.creators(id) on delete cascade,
  title text not null,
  description text,
  live_type text not null default 'solo' check (live_type in ('solo','co_live','guest','panel','podcast','gaming','watch_party','workshop','premiere')),
  mode text not null default 'video' check (mode in ('video','audio','hybrid')),
  status text not null default 'scheduled' check (status in ('scheduled','live','ended','cancelled')),
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  recording_video_id bigint references public.videos(id) on delete set null,
  max_stage_slots integer not null default 2 check (max_stage_slots between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists live_events_creator_status_idx on public.live_events(creator_id, status, scheduled_at);

create table if not exists public.live_participants (
  id bigint generated by default as identity primary key,
  live_event_id bigint not null references public.live_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'audience' check (role in ('host','co_host','guest','speaker','audience','producer','moderator')),
  status text not null default 'requested' check (status in ('requested','invited','active','left','removed')),
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists live_participants_event_idx on public.live_participants(live_event_id, role, status);

create table if not exists public.live_questions (
  id uuid primary key default gen_random_uuid(),
  live_event_id bigint not null references public.live_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  vote_count integer not null default 0,
  status text not null default 'queued' check (status in ('queued','selected','answered','dismissed')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists live_questions_event_idx on public.live_questions(live_event_id, status, vote_count desc, created_at asc);

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  live_event_id bigint not null references public.live_events(id) on delete cascade,
  session_type text not null default 'recording' check (session_type in ('recording','highlights','clip','summary','q_and_a','transcript')),
  title text,
  media_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists live_sessions_event_idx on public.live_sessions(live_event_id, session_type, created_at desc);

create table if not exists public.ravine_spaces (
  id uuid primary key default gen_random_uuid(),
  host_creator_id bigint references public.creators(id) on delete cascade,
  title text not null,
  description text,
  space_type text not null default 'audio' check (space_type in ('audio','video','hybrid')),
  format text not null default 'open' check (format in ('open','panel','debate','interview','workshop','town_hall')),
  status text not null default 'scheduled' check (status in ('scheduled','live','ended','cancelled')),
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  recording_session_id uuid references public.live_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.ravine_space_participants (
  space_id uuid not null references public.ravine_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'listener' check (role in ('host','co_host','speaker','listener','moderator')),
  status text not null default 'active' check (status in ('active','left','removed')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table if not exists public.work_ratings (
  id uuid primary key default gen_random_uuid(),
  work_id bigint not null references public.videos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 10),
  review text check (review is null or char_length(trim(review)) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_id, user_id)
);
create index if not exists work_ratings_work_idx on public.work_ratings(work_id, rating);

create table if not exists public.creator_external_links (
  id uuid primary key default gen_random_uuid(),
  creator_id bigint not null references public.creators(id) on delete cascade,
  platform text not null check (platform in ('youtube','tiktok','instagram','twitch','kick','x','behance','linkedin','website','other')),
  url text not null,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (creator_id, platform, url)
);

create table if not exists public.creator_spotlights (
  id uuid primary key default gen_random_uuid(),
  creator_id bigint not null references public.creators(id) on delete cascade,
  work_id bigint references public.videos(id) on delete cascade,
  event_id bigint references public.live_events(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','active','expired','rejected')),
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_opportunities (
  id uuid primary key default gen_random_uuid(),
  creator_id bigint references public.creators(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  opportunity_type text not null default 'collaboration' check (opportunity_type in ('collaboration','job','casting','freelance','partnership')),
  status text not null default 'open' check (status in ('open','closed','filled','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ravine_collections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  owner_creator_id bigint references public.creators(id) on delete cascade,
  title text not null,
  description text,
  visibility text not null default 'private' check (visibility in ('private','public','members')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (owner_user_id is not null or owner_creator_id is not null)
);
create table if not exists public.ravine_collection_items (
  collection_id uuid not null references public.ravine_collections(id) on delete cascade,
  work_id bigint references public.videos(id) on delete cascade,
  creator_id bigint references public.creators(id) on delete cascade,
  community_id uuid references public.communities(id) on delete cascade,
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (num_nonnulls(work_id, creator_id, community_id) = 1),
  primary key (collection_id, sort_order)
);

create table if not exists public.ravine_watch_parties (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  work_id bigint references public.videos(id) on delete set null,
  title text not null,
  status text not null default 'scheduled' check (status in ('scheduled','live','ended','cancelled')),
  visibility text not null default 'invite_only' check (visibility in ('public','followers','members','invite_only')),
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- RLS: ownership/public discovery foundation. Detailed membership gating remains enforced in the application layer until migration is applied and verified.
alter table public.creator_membership_tiers enable row level security;
alter table public.creator_memberships enable row level security;
alter table public.creator_broadcasts enable row level security;
alter table public.creator_broadcast_messages enable row level security;
alter table public.creator_circles enable row level security;
alter table public.creator_circle_members enable row level security;
alter table public.work_access_policies enable row level security;
alter table public.live_events enable row level security;
alter table public.live_participants enable row level security;
alter table public.live_questions enable row level security;
alter table public.live_sessions enable row level security;
alter table public.ravine_spaces enable row level security;
alter table public.ravine_space_participants enable row level security;
alter table public.work_ratings enable row level security;
alter table public.creator_external_links enable row level security;
alter table public.creator_spotlights enable row level security;
alter table public.creator_opportunities enable row level security;
alter table public.ravine_collections enable row level security;
alter table public.ravine_collection_items enable row level security;
alter table public.ravine_watch_parties enable row level security;

-- Public read policies where safe.
drop policy if exists creator_public_tiers_read on public.creator_membership_tiers;
create policy creator_public_tiers_read on public.creator_membership_tiers for select using (is_active = true);
drop policy if exists creator_public_broadcast_read on public.creator_broadcasts;
create policy creator_public_broadcast_read on public.creator_broadcasts for select using (is_active = true);
drop policy if exists creator_public_external_links_read on public.creator_external_links;
create policy creator_public_external_links_read on public.creator_external_links for select using (true);
drop policy if exists public_work_ratings_read on public.work_ratings;
create policy public_work_ratings_read on public.work_ratings for select using (true);
drop policy if exists public_spotlights_read on public.creator_spotlights;
create policy public_spotlights_read on public.creator_spotlights for select using (status = 'active');

-- User-owned rating writes.
drop policy if exists work_ratings_insert_own on public.work_ratings;
create policy work_ratings_insert_own on public.work_ratings for insert with check (auth.uid() = user_id);
drop policy if exists work_ratings_update_own on public.work_ratings;
create policy work_ratings_update_own on public.work_ratings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists work_ratings_delete_own on public.work_ratings;
create policy work_ratings_delete_own on public.work_ratings for delete using (auth.uid() = user_id);

-- Creator ownership helpers.
drop policy if exists creator_owner_tiers_manage on public.creator_membership_tiers;
create policy creator_owner_tiers_manage on public.creator_membership_tiers for all using (exists (select 1 from public.creators c where c.id = creator_membership_tiers.creator_id and c.user_id = auth.uid())) with check (exists (select 1 from public.creators c where c.id = creator_membership_tiers.creator_id and c.user_id = auth.uid()));
drop policy if exists creator_owner_broadcast_manage on public.creator_broadcasts;
create policy creator_owner_broadcast_manage on public.creator_broadcasts for all using (exists (select 1 from public.creators c where c.id = creator_broadcasts.creator_id and c.user_id = auth.uid())) with check (exists (select 1 from public.creators c where c.id = creator_broadcasts.creator_id and c.user_id = auth.uid()));
drop policy if exists creator_owner_live_manage on public.live_events;
create policy creator_owner_live_manage on public.live_events for all using (exists (select 1 from public.creators c where c.id = live_events.creator_id and c.user_id = auth.uid())) with check (exists (select 1 from public.creators c where c.id = live_events.creator_id and c.user_id = auth.uid()));

drop policy if exists public_live_schedule_read on public.live_events;
create policy public_live_schedule_read on public.live_events for select using (status in ('scheduled','live','ended'));
drop policy if exists public_live_sessions_read on public.live_sessions;
create policy public_live_sessions_read on public.live_sessions for select using (true);
drop policy if exists public_spaces_read on public.ravine_spaces;
create policy public_spaces_read on public.ravine_spaces for select using (status in ('scheduled','live','ended'));

-- Community creator ownership is handled through the existing community model plus creator_id.
drop policy if exists creator_community_owner_manage on public.communities;
create policy creator_community_owner_manage on public.communities for all using (creator_id is not null and exists (select 1 from public.creators c where c.id = communities.creator_id and c.user_id = auth.uid())) with check (creator_id is not null and exists (select 1 from public.creators c where c.id = communities.creator_id and c.user_id = auth.uid()));
