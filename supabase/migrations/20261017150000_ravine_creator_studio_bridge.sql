-- RAVINE Creator Studio bridge: legacy videos <-> Creator Identity tiers.
-- STAGED ONLY. Requires the platform-domain and capability-schema migrations first.
-- Existing approved creator profiles are grandfathered as elevated_creator so this
-- rollout does not unexpectedly remove their existing Podcast/Documentary publishing.
-- Monthly quotas remain disabled by the existing feature flag until explicitly approved.

alter table public.ravine_next_creator_identities
  add column if not exists legacy_creator_id bigint
  references public.creators(id) on delete set null;

create unique index if not exists ravine_next_creator_legacy_creator_uidx
  on public.ravine_next_creator_identities(legacy_creator_id)
  where legacy_creator_id is not null;

alter table public.videos
  add column if not exists work_format text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.videos'::regclass
      and conname = 'videos_work_format_check'
  ) then
    alter table public.videos
      add constraint videos_work_format_check
      check (work_format is null or work_format in ('short_film','feature_film'));
  end if;
end
$$;

comment on column public.videos.work_format is
  'RAVINE film subtype. Stored separately from content_type=film to preserve legacy player and query compatibility.';

-- Preserve existing creator publishing capabilities while introducing explicit tiers.
insert into public.ravine_next_creator_identities (
  owner_user_id, name, handle, avatar_url, bio, specialties, status, creator_tier, legacy_creator_id
)
select
  c.user_id,
  coalesce(nullif(trim(c.name), ''), 'Creator'),
  lower(regexp_replace(coalesce(nullif(trim(c.username), ''), 'creator') || '-legacy-' || c.id::text, '[^a-zA-Z0-9_-]+', '-', 'g')),
  c.avatar_url,
  c.bio,
  case when nullif(trim(c.specialty), '') is null then '{}'::text[] else array[trim(c.specialty)]::text[] end,
  'creator',
  'elevated_creator',
  c.id
from public.creators c
where c.user_id is not null
on conflict (legacy_creator_id) where legacy_creator_id is not null
do update set
  owner_user_id = excluded.owner_user_id,
  name = excluded.name,
  avatar_url = excluded.avatar_url,
  bio = excluded.bio,
  specialties = excluded.specialties,
  updated_at = now();

create or replace function public.ravine_sync_legacy_creator_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handle text;
begin
  if new.user_id is null then
    delete from public.ravine_next_creator_identities
     where legacy_creator_id = new.id;
    return new;
  end if;

  v_handle := lower(regexp_replace(
    coalesce(nullif(trim(new.username), ''), 'creator') || '-legacy-' || new.id::text,
    '[^a-zA-Z0-9_-]+', '-', 'g'
  ));

  insert into public.ravine_next_creator_identities (
    owner_user_id, name, handle, avatar_url, bio, specialties, status, creator_tier, legacy_creator_id
  ) values (
    new.user_id,
    coalesce(nullif(trim(new.name), ''), 'Creator'),
    v_handle,
    new.avatar_url,
    new.bio,
    case when nullif(trim(new.specialty), '') is null then '{}'::text[] else array[trim(new.specialty)]::text[] end,
    'creator',
    'creator',
    new.id
  )
  on conflict (legacy_creator_id) where legacy_creator_id is not null
  do update set
    owner_user_id = excluded.owner_user_id,
    name = excluded.name,
    handle = excluded.handle,
    avatar_url = excluded.avatar_url,
    bio = excluded.bio,
    specialties = excluded.specialties,
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.ravine_sync_legacy_creator_identity() from public, anon, authenticated;

drop trigger if exists ravine_sync_legacy_creator_identity_trigger on public.creators;
create trigger ravine_sync_legacy_creator_identity_trigger
after insert or update of user_id, name, username, avatar_url, bio, specialty
on public.creators
for each row execute function public.ravine_sync_legacy_creator_identity();

-- Current-month usage ledger for the existing videos table. Quotas are counted on
-- publication, not on draft creation, and writes remain transactionally serialized
-- by locking the mapped creator identity row.
create table if not exists public.ravine_legacy_creator_publish_quota_usage (
  id bigint generated always as identity primary key,
  creator_identity_id bigint not null references public.ravine_next_creator_identities(id) on delete cascade,
  video_id bigint not null references public.videos(id) on delete cascade,
  work_type text not null check (work_type in ('short','video','podcast','documentary','short_film','feature_film')),
  quota_month date not null,
  created_at timestamptz not null default now(),
  unique (video_id, quota_month)
);

create index if not exists ravine_legacy_creator_publish_quota_lookup_idx
  on public.ravine_legacy_creator_publish_quota_usage (creator_identity_id, work_type, quota_month);

alter table public.ravine_legacy_creator_publish_quota_usage enable row level security;
revoke all on public.ravine_legacy_creator_publish_quota_usage from public, anon, authenticated;

-- Seed current-month already-published works so turning on quotas later does not
-- accidentally treat this month's existing publications as new quota capacity.
insert into public.ravine_legacy_creator_publish_quota_usage (
  creator_identity_id, video_id, work_type, quota_month
)
select
  i.id,
  v.id,
  case
    when v.work_format in ('short_film','feature_film') then v.work_format
    when v.content_type = 'film' then 'feature_film'
    else v.content_type
  end,
  date_trunc('month', timezone('utc', v.created_at))::date
from public.videos v
join public.ravine_next_creator_identities i on i.legacy_creator_id = v.creator_id
where v.published = true
  and v.created_at >= date_trunc('month', timezone('utc', now()))::date
  and (
    v.content_type in ('short','video','podcast','documentary')
    or v.content_type = 'film'
  )
on conflict (video_id, quota_month) do nothing;

create or replace function public.ravine_validate_legacy_creator_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_identity_id bigint;
  v_tier text;
  v_type text;
  v_quota_enabled boolean := false;
  v_limit integer := null;
  v_used integer := 0;
  v_month date := date_trunc('month', timezone('utc', now()))::date;
begin
  if new.creator_id is null or new.published is not true then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.published is true
     and old.creator_id = new.creator_id
     and old.content_type is not distinct from new.content_type
     and old.work_format is not distinct from new.work_format then
    return new;
  end if;

  if v_actor is null then
    raise exception 'RAVINE_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select i.id, i.creator_tier
    into v_identity_id, v_tier
    from public.creators c
    join public.ravine_next_creator_identities i on i.legacy_creator_id = c.id
   where c.id = new.creator_id
     and (c.user_id = v_actor or public.is_ravine_admin())
   for update of i;

  if not found then
    raise exception 'RAVINE_CREATOR_IDENTITY_NOT_LINKED_OR_NOT_OWNED' using errcode = '42501';
  end if;

  if new.user_id is not null
     and new.user_id <> v_actor
     and not public.is_ravine_admin() then
    raise exception 'RAVINE_UPLOAD_OWNER_MISMATCH' using errcode = '42501';
  end if;

  if new.content_type = 'live' then
    return new;
  end if;

  if new.work_format in ('short_film','feature_film') then
    v_type := new.work_format;
    if new.content_type <> 'film' then
      raise exception 'RAVINE_INVALID_CONTENT_TYPE' using errcode = '22023';
    end if;
  elsif new.content_type = 'film' then
    -- Old Studio films remain readable/publishable, but count as feature films
    -- under the new capability model.
    v_type := 'feature_film';
    new.work_format := coalesce(new.work_format, 'feature_film');
  else
    v_type := new.content_type;
  end if;

  if v_type not in ('short','video','podcast','documentary','short_film','feature_film') then
    raise exception 'RAVINE_INVALID_CONTENT_TYPE' using errcode = '22023';
  end if;

  if v_tier = 'viewer' and v_type not in ('short','video') then
    raise exception 'RAVINE_TIER_RESTRICTED' using errcode = '42501';
  elsif v_tier = 'creator' and v_type not in ('short','video','short_film','feature_film') then
    raise exception 'RAVINE_TIER_RESTRICTED' using errcode = '42501';
  end if;

  select coalesce((setting_value #>> '{}')::boolean, false)
    into v_quota_enabled
    from public.ravine_creator_capability_settings
   where setting_key = 'monthly_quotas_enabled';
  v_quota_enabled := coalesce(v_quota_enabled, false);

  if v_tier = 'viewer' and v_type = 'video' then
    v_limit := 10;
  elsif v_tier = 'creator' and v_type = 'short_film' then
    v_limit := 2;
  elsif v_tier = 'creator' and v_type = 'feature_film' then
    v_limit := 1;
  elsif v_tier = 'elevated_creator' and v_type in ('podcast','documentary') then
    v_limit := 5;
  elsif v_tier = 'elevated_creator' and v_type = 'short_film' then
    v_limit := 2;
  elsif v_tier = 'elevated_creator' and v_type = 'feature_film' then
    v_limit := 1;
  elsif v_tier = 'artist' and v_type = 'feature_film' then
    v_limit := 3;
  end if;

  if v_quota_enabled and v_limit is not null then
    select count(*)::integer into v_used
      from public.ravine_legacy_creator_publish_quota_usage
     where creator_identity_id = v_identity_id
       and work_type = v_type
       and quota_month = v_month
       and video_id <> coalesce(new.id, -1);

    if v_used >= v_limit then
      raise exception 'RAVINE_MONTHLY_QUOTA_REACHED' using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.ravine_validate_legacy_creator_publish() from public, anon, authenticated;

drop trigger if exists ravine_validate_legacy_creator_publish_trigger on public.videos;
create trigger ravine_validate_legacy_creator_publish_trigger
before insert or update of published, content_type, work_format, creator_id
on public.videos
for each row execute function public.ravine_validate_legacy_creator_publish();

create or replace function public.ravine_record_legacy_creator_publish_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_identity_id bigint;
  v_type text;
  v_month date := date_trunc('month', timezone('utc', now()))::date;
begin
  if new.published is not true then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.published is true
     and old.creator_id = new.creator_id
     and old.content_type is not distinct from new.content_type
     and old.work_format is not distinct from new.work_format then
    return new;
  end if;

  select i.id into v_identity_id
    from public.ravine_next_creator_identities i
   where i.legacy_creator_id = new.creator_id;

  if v_identity_id is null then
    return new;
  end if;

  if new.work_format in ('short_film','feature_film') then
    v_type := new.work_format;
  elsif new.content_type = 'film' then
    v_type := 'feature_film';
  else
    v_type := new.content_type;
  end if;

  if v_type in ('short','video','podcast','documentary','short_film','feature_film') then
    insert into public.ravine_legacy_creator_publish_quota_usage (
      creator_identity_id, video_id, work_type, quota_month
    ) values (v_identity_id, new.id, v_type, v_month)
    on conflict (video_id, quota_month) do update
      set creator_identity_id = excluded.creator_identity_id,
          work_type = excluded.work_type;
  end if;

  return new;
end;
$$;

revoke all on function public.ravine_record_legacy_creator_publish_usage() from public, anon, authenticated;

drop trigger if exists ravine_record_legacy_creator_publish_usage_trigger on public.videos;
create trigger ravine_record_legacy_creator_publish_usage_trigger
after insert or update of published, content_type, work_format, creator_id
on public.videos
for each row execute function public.ravine_record_legacy_creator_publish_usage();

comment on table public.ravine_legacy_creator_publish_quota_usage is
  'Monthly usage ledger for tier-based publication of legacy Studio videos. Numeric enforcement stays disabled until monthly_quotas_enabled is explicitly enabled.';


-- Live eligibility: viewers may browse, but only Creator and higher identities
-- may transition a new-domain live session into the live state.
create or replace function public.ravine_enforce_next_live_tier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_tier text;
begin
  if new.status <> 'live' then
    return new;
  end if;

  if v_actor is null then
    raise exception 'RAVINE_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select owner_user_id, creator_tier
    into v_owner, v_tier
    from public.ravine_next_creator_identities
   where id = new.creator_identity_id
   for update;

  if not found or (v_owner <> v_actor and not public.is_ravine_admin()) then
    raise exception 'RAVINE_CREATOR_IDENTITY_NOT_OWNED' using errcode = '42501';
  end if;

  if v_tier = 'viewer' then
    raise exception 'RAVINE_TIER_RESTRICTED' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.ravine_enforce_next_live_tier() from public, anon, authenticated;

drop trigger if exists ravine_enforce_next_live_tier_trigger on public.ravine_next_live_sessions;
create trigger ravine_enforce_next_live_tier_trigger
before insert or update of status, creator_identity_id
on public.ravine_next_live_sessions
for each row execute function public.ravine_enforce_next_live_tier();

comment on function public.ravine_enforce_next_live_tier() is
  'Blocks viewers from starting live sessions and verifies that the session belongs to the authenticated creator identity.';


-- The new live-session table is RLS-enabled by the domain foundation but has no
-- owner write policy there yet. Add the minimum owner-scoped surface needed for
-- the tier trigger to protect real session creation and start transitions.
drop policy if exists ravine_next_live_owner_select on public.ravine_next_live_sessions;
create policy ravine_next_live_owner_select
on public.ravine_next_live_sessions
for select to authenticated
using (
  public.is_ravine_admin()
  or exists (
    select 1
      from public.ravine_next_creator_identities i
     where i.id = creator_identity_id
       and i.owner_user_id = auth.uid()
  )
);

drop policy if exists ravine_next_live_owner_insert on public.ravine_next_live_sessions;
create policy ravine_next_live_owner_insert
on public.ravine_next_live_sessions
for insert to authenticated
with check (
  public.is_ravine_admin()
  or exists (
    select 1
      from public.ravine_next_creator_identities i
     where i.id = creator_identity_id
       and i.owner_user_id = auth.uid()
  )
);

drop policy if exists ravine_next_live_owner_update on public.ravine_next_live_sessions;
create policy ravine_next_live_owner_update
on public.ravine_next_live_sessions
for update to authenticated
using (
  public.is_ravine_admin()
  or exists (
    select 1
      from public.ravine_next_creator_identities i
     where i.id = creator_identity_id
       and i.owner_user_id = auth.uid()
  )
)
with check (
  public.is_ravine_admin()
  or exists (
    select 1
      from public.ravine_next_creator_identities i
     where i.id = creator_identity_id
       and i.owner_user_id = auth.uid()
  )
);

grant select, insert, update on public.ravine_next_live_sessions to authenticated;


-- Quota ledgers are historical accounting records. They must survive deleting a
-- published work or identity; otherwise deleting/recreating content could reset
-- monthly usage and bypass the quota once the feature flag is enabled.
do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select conname
      from pg_constraint
     where conrelid = 'public.ravine_creator_publish_quota_usage'::regclass
       and contype = 'f'
  loop
    execute format('alter table public.ravine_creator_publish_quota_usage drop constraint %I', v_constraint.conname);
  end loop;

  for v_constraint in
    select conname
      from pg_constraint
     where conrelid = 'public.ravine_legacy_creator_publish_quota_usage'::regclass
       and contype = 'f'
  loop
    execute format('alter table public.ravine_legacy_creator_publish_quota_usage drop constraint %I', v_constraint.conname);
  end loop;
end
$$;

comment on table public.ravine_creator_publish_quota_usage is
  'Historical monthly publication ledger. Intentionally has no foreign keys so work or identity deletion cannot erase quota history.';
comment on table public.ravine_legacy_creator_publish_quota_usage is
  'Historical monthly publication ledger for legacy Studio videos. Intentionally has no foreign keys so deletion cannot erase quota history.';
