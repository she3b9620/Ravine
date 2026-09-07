-- RAVINE social/community/operations completion foundation v1
-- STAGED ONLY. Intentionally not applied to the connected Supabase project.

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
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id bigint references public.ravine_next_works(id) on delete cascade,
  broadcast_id uuid references public.ravine_next_broadcasts(id) on delete cascade,
  reaction text not null check (reaction in ('like','love','celebrate','insightful')),
  created_at timestamptz not null default now(),
  check ((work_id is not null) <> (broadcast_id is not null)),
  primary key (user_id, work_id, broadcast_id, reaction)
);
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
create table if not exists public.ravine_next_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete cascade,
  body text not null,
  attachment_meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  read_at timestamptz
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
  updated_at timestamptz not null default now()
);
create table if not exists public.ravine_next_community_threads (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.ravine_next_community_posts(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  parent_thread_id uuid references public.ravine_next_community_threads(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
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
create table if not exists public.ravine_next_live_guest_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ravine_next_live_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('video','audio','camera_off')),
  status text not null default 'requested' check (status in ('requested','queued','approved','rejected','cancelled')),
  created_at timestamptz not null default now()
);
create table if not exists public.ravine_next_spaces (
  id uuid primary key default gen_random_uuid(),
  creator_identity_id bigint references public.ravine_next_creator_identities(id) on delete set null,
  community_id uuid references public.ravine_next_communities(id) on delete set null,
  title text not null,
  space_type text not null check (space_type in ('audio','video','hybrid','debate','interview','industry','idea','gaming','watch_listening','town_hall')),
  status text not null default 'scheduled' check (status in ('scheduled','live','recorded','archived')),
  starts_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.ravine_next_opportunities (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  creator_identity_id bigint references public.ravine_next_creator_identities(id) on delete set null,
  title text not null,
  description text,
  opportunity_type text not null check (opportunity_type in ('editor','cinematographer','photographer','actor','voice_actor','designer','musician','producer','casting','brand','freelance','internship','volunteer','other')),
  location_text text,
  remote boolean not null default true,
  status text not null default 'open' check (status in ('draft','open','closed','filled')),
  created_at timestamptz not null default now()
);
create table if not exists public.ravine_next_discovery_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  work_id bigint references public.ravine_next_works(id) on delete set null,
  creator_identity_id bigint references public.ravine_next_creator_identities(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists public.ravine_next_ai_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  agent_key text not null,
  action_class text not null check (action_class in ('read','recommend','tool','sensitive')),
  model_key text,
  model_version text,
  policy_version text,
  input_type text,
  confidence numeric(5,4),
  risk_score numeric(5,4),
  reason_codes text[] not null default '{}',
  decision text,
  action_taken text,
  human_override boolean,
  created_at timestamptz not null default now()
);

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
alter table public.ravine_next_opportunities enable row level security;
alter table public.ravine_next_discovery_events enable row level security;
alter table public.ravine_next_ai_audit_events enable row level security;

create policy ravine_next_saves_owner on public.ravine_next_saves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy ravine_next_reactions_owner on public.ravine_next_reactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy ravine_next_notifications_owner on public.ravine_next_notifications for select using (auth.uid() = user_id);
create policy ravine_next_messages_participant on public.ravine_next_messages for select using (auth.uid() = sender_user_id or auth.uid() = recipient_user_id);
create policy ravine_next_messages_sender on public.ravine_next_messages for insert with check (auth.uid() = sender_user_id);
create policy ravine_next_discovery_owner on public.ravine_next_discovery_events for insert with check (auth.uid() = user_id);
create policy ravine_next_discovery_self on public.ravine_next_discovery_events for select using (auth.uid() = user_id);
create policy ravine_next_ai_audit_internal on public.ravine_next_ai_audit_events for select using (auth.uid() = actor_user_id);
create policy ravine_next_opportunity_owner on public.ravine_next_opportunities for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);
