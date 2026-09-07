-- RAVINE social/community/operations foundation v2
-- STAGED ONLY. Not applied to the connected Supabase project.
-- Extends 20260907120000_ravine_platform_domain_foundation.sql.

create table if not exists public.ravine_next_connections (
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  addressee_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_user_id, addressee_user_id),
  check (requester_user_id <> addressee_user_id)
);

create table if not exists public.ravine_next_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id bigint not null references public.ravine_next_works(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, work_id)
);

create table if not exists public.ravine_next_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id bigint references public.ravine_next_works(id) on delete cascade,
  broadcast_id uuid references public.ravine_next_broadcasts(id) on delete cascade,
  reaction text not null check (reaction in ('like','love','celebrate','insightful')),
  created_at timestamptz not null default now(),
  check ((work_id is not null) <> (broadcast_id is not null))
);
create unique index if not exists ravine_next_reactions_work_unique on public.ravine_next_reactions(user_id, work_id, reaction) where work_id is not null;
create unique index if not exists ravine_next_reactions_broadcast_unique on public.ravine_next_reactions(user_id, broadcast_id, reaction) where broadcast_id is not null;

create table if not exists public.ravine_next_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('follow','like','comment','select','live_reminder','invite','community','membership','broadcast','system')),
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ravine_next_notifications_user_idx on public.ravine_next_notifications(user_id, created_at desc);

create table if not exists public.ravine_next_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete cascade,
  body text not null,
  attachment_meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (recipient_user_id is null or recipient_user_id <> sender_user_id)
);
create index if not exists ravine_next_messages_conversation_idx on public.ravine_next_messages(conversation_id, created_at);

create table if not exists public.ravine_next_community_channels (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.ravine_next_communities(id) on delete cascade,
  name text not null,
  channel_type text not null check (channel_type in ('text','voice','video','forum','media')),
  position integer not null default 0,
  private boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ravine_next_community_channels_idx on public.ravine_next_community_channels(community_id, position);

create table if not exists public.ravine_next_community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.ravine_next_communities(id) on delete cascade,
  channel_id uuid references public.ravine_next_community_channels(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  post_type text not null default 'text' check (post_type in ('text','question','poll','announcement','media','link')),
  title text,
  body text,
  media_meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (body is not null or title is not null or media_meta <> '{}')
);
create index if not exists ravine_next_community_posts_idx on public.ravine_next_community_posts(community_id, created_at desc);

create table if not exists public.ravine_next_community_threads (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.ravine_next_community_posts(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  parent_thread_id uuid references public.ravine_next_community_threads(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists ravine_next_community_threads_idx on public.ravine_next_community_threads(post_id, created_at);

create table if not exists public.ravine_next_community_events (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.ravine_next_communities(id) on delete cascade,
  creator_identity_id bigint references public.ravine_next_creator_identities(id) on delete set null,
  title text not null,
  description text,
  event_type text not null check (event_type in ('premiere','workshop','masterclass','meetup','tournament','podcast','community','fan_gathering','local_creator')),
  starts_at timestamptz,
  ends_at timestamptz,
  related_work_id bigint references public.ravine_next_works(id) on delete set null,
  related_live_id uuid references public.ravine_next_live_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ravine_next_community_events_idx on public.ravine_next_community_events(community_id, starts_at);

create table if not exists public.ravine_next_membership_drops (
  id uuid primary key default gen_random_uuid(),
  creator_identity_id bigint not null references public.ravine_next_creator_identities(id) on delete cascade,
  tier_id uuid references public.ravine_next_membership_tiers(id) on delete set null,
  work_id bigint references public.ravine_next_works(id) on delete set null,
  title text not null,
  description text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ravine_next_membership_drops_idx on public.ravine_next_membership_drops(creator_identity_id, published_at desc);

create table if not exists public.ravine_next_live_guest_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ravine_next_live_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('video','audio','camera_off')),
  status text not null default 'requested' check (status in ('requested','queued','approved','rejected','cancelled')),
  created_at timestamptz not null default now()
);
create unique index if not exists ravine_next_live_guest_requests_active_idx on public.ravine_next_live_guest_requests(session_id, user_id) where status in ('requested','queued','approved');

create table if not exists public.ravine_next_spaces (
  id uuid primary key default gen_random_uuid(),
  creator_identity_id bigint references public.ravine_next_creator_identities(id) on delete set null,
  community_id uuid references public.ravine_next_communities(id) on delete set null,
  title text not null,
  space_type text not null check (space_type in ('audio','video','hybrid','debate','interview','industry','idea','gaming','watch_listening','town_hall')),
  status text not null default 'scheduled' check (status in ('scheduled','live','recorded','archived')),
  starts_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check (creator_identity_id is not null or community_id is not null)
);
create index if not exists ravine_next_spaces_idx on public.ravine_next_spaces(status, starts_at);
create index if not exists ravine_next_discovery_events_feed_idx on public.ravine_next_discovery_events(user_id, created_at desc);

alter table public.ravine_next_connections enable row level security;
alter table public.ravine_next_saves enable row level security;
alter table public.ravine_next_reactions enable row level security;
alter table public.ravine_next_notifications enable row level security;
alter table public.ravine_next_messages enable row level security;
alter table public.ravine_next_community_channels enable row level security;
alter table public.ravine_next_community_posts enable row level security;
alter table public.ravine_next_community_threads enable row level security;
alter table public.ravine_next_community_events enable row level security;
alter table public.ravine_next_membership_drops enable row level security;
alter table public.ravine_next_live_guest_requests enable row level security;
alter table public.ravine_next_spaces enable row level security;
alter table public.ravine_next_discovery_events enable row level security;

create policy ravine_next_connections_participant on public.ravine_next_connections for all to authenticated using (auth.uid() = requester_user_id or auth.uid() = addressee_user_id) with check (auth.uid() = requester_user_id or auth.uid() = addressee_user_id);
create policy ravine_next_saves_owner on public.ravine_next_saves for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy ravine_next_reactions_owner on public.ravine_next_reactions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy ravine_next_notifications_owner on public.ravine_next_notifications for select to authenticated using (auth.uid() = user_id);
create policy ravine_next_notifications_mark_read on public.ravine_next_notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy ravine_next_messages_participant on public.ravine_next_messages for select to authenticated using (auth.uid() = sender_user_id or auth.uid() = recipient_user_id);
create policy ravine_next_messages_sender on public.ravine_next_messages for insert to authenticated with check (auth.uid() = sender_user_id);
create policy ravine_next_messages_mark_read on public.ravine_next_messages for update to authenticated using (auth.uid() = sender_user_id or auth.uid() = recipient_user_id) with check (auth.uid() = sender_user_id or auth.uid() = recipient_user_id);

create policy ravine_next_community_channel_member_read on public.ravine_next_community_channels for select to authenticated using (exists (select 1 from public.ravine_next_community_members m where m.community_id = ravine_next_community_channels.community_id and m.user_id = auth.uid() and m.status = 'active'));
create policy ravine_next_community_post_member_read on public.ravine_next_community_posts for select to authenticated using (exists (select 1 from public.ravine_next_community_members m where m.community_id = ravine_next_community_posts.community_id and m.user_id = auth.uid() and m.status = 'active'));
create policy ravine_next_community_post_member_insert on public.ravine_next_community_posts for insert to authenticated with check (auth.uid() = author_user_id and exists (select 1 from public.ravine_next_community_members m where m.community_id = ravine_next_community_posts.community_id and m.user_id = auth.uid() and m.status = 'active'));
create policy ravine_next_community_post_author_update on public.ravine_next_community_posts for update to authenticated using (auth.uid() = author_user_id) with check (auth.uid() = author_user_id);
create policy ravine_next_community_thread_member_read on public.ravine_next_community_threads for select to authenticated using (exists (select 1 from public.ravine_next_community_posts p join public.ravine_next_community_members m on m.community_id = p.community_id where p.id = ravine_next_community_threads.post_id and m.user_id = auth.uid() and m.status = 'active'));
create policy ravine_next_community_thread_member_insert on public.ravine_next_community_threads for insert to authenticated with check (auth.uid() = author_user_id and exists (select 1 from public.ravine_next_community_posts p join public.ravine_next_community_members m on m.community_id = p.community_id where p.id = ravine_next_community_threads.post_id and m.user_id = auth.uid() and m.status = 'active'));
create policy ravine_next_community_thread_author_update on public.ravine_next_community_threads for update to authenticated using (auth.uid() = author_user_id) with check (auth.uid() = author_user_id);
create policy ravine_next_community_event_member_read on public.ravine_next_community_events for select to authenticated using (exists (select 1 from public.ravine_next_community_members m where m.community_id = ravine_next_community_events.community_id and m.user_id = auth.uid() and m.status = 'active'));

create policy ravine_next_membership_drop_creator_all on public.ravine_next_membership_drops for all to authenticated using (exists (select 1 from public.ravine_next_creator_identities c where c.id = ravine_next_membership_drops.creator_identity_id and c.owner_user_id = auth.uid())) with check (exists (select 1 from public.ravine_next_creator_identities c where c.id = ravine_next_membership_drops.creator_identity_id and c.owner_user_id = auth.uid()));
create policy ravine_next_live_guest_request_participant on public.ravine_next_live_guest_requests for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.ravine_next_live_sessions s join public.ravine_next_creator_identities c on c.id = s.creator_identity_id where s.id = ravine_next_live_guest_requests.session_id and c.owner_user_id = auth.uid()));
create policy ravine_next_live_guest_request_self_insert on public.ravine_next_live_guest_requests for insert to authenticated with check (auth.uid() = user_id);
create policy ravine_next_live_guest_request_self_update on public.ravine_next_live_guest_requests for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy ravine_next_space_member_read on public.ravine_next_spaces for select to authenticated using ((community_id is not null and exists (select 1 from public.ravine_next_community_members m where m.community_id = ravine_next_spaces.community_id and m.user_id = auth.uid() and m.status = 'active')) or (creator_identity_id is not null and exists (select 1 from public.ravine_next_creator_identities c where c.id = ravine_next_spaces.creator_identity_id and c.owner_user_id = auth.uid())));
create policy ravine_next_discovery_owner on public.ravine_next_discovery_events for insert to authenticated with check (auth.uid() = user_id or user_id is null);
create policy ravine_next_discovery_self on public.ravine_next_discovery_events for select to authenticated using (auth.uid() = user_id);

-- Existing canonical platform objects are intentionally not redefined here:
-- ravine_next_opportunities and ravine_next_ai_audit_events are owned by the prior platform-domain migration.
