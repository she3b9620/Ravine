-- RAVINE founder + creator upload policy foundation.
-- Viewer defaults: 30 Shorts, 10 Video/Film/Documentary, 2 Podcast per calendar month.
-- Creator identities owned by the account are unlimited; Founder is unlimited.

create table if not exists public.ravine_founders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  founder_since timestamptz not null default now(),
  is_active boolean not null default true
);
alter table public.ravine_founders enable row level security;

-- The Founder grant is derived from the existing RAVINE creator identity and admin record,
-- so this migration does not hard-code a user UUID.
insert into public.ravine_founders (user_id)
select c.user_id
from public.creators c
join public.admin_users a on a.user_id = c.user_id
where c.username = 'ravine'
  and c.user_id is not null
on conflict (user_id) do update set is_active = true;

-- The founder account is also a creator-capable account. The creator identity itself remains
-- the scoped public persona; the personal account owns it through creators.user_id.
update public.profiles p
set is_creator = true,
    is_verified = true,
    updated_at = now()
from public.creators c
where c.username = 'ravine'
  and c.user_id = p.id;

insert into public.user_roles (user_id, role)
select f.user_id, 'admin'
from public.ravine_founders f
on conflict (user_id) do update set role = 'admin';

create table if not exists public.ravine_creator_status_grants (
  creator_id bigint not null references public.creators(id) on delete cascade,
  status text not null check (status in ('verified_creator','select_creator')),
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  is_active boolean not null default true,
  primary key (creator_id, status)
);
alter table public.ravine_creator_status_grants enable row level security;

drop policy if exists creator_status_grants_public_read on public.ravine_creator_status_grants;
create policy creator_status_grants_public_read
on public.ravine_creator_status_grants
for select
using (is_active = true);

drop policy if exists creator_status_grants_admin_write on public.ravine_creator_status_grants;
create policy creator_status_grants_admin_write
on public.ravine_creator_status_grants
for all
using (is_ravine_admin())
with check (is_ravine_admin());

insert into public.ravine_creator_status_grants (creator_id, status, granted_by)
select c.id, s.status, c.user_id
from public.creators c
cross join (values ('verified_creator'), ('select_creator')) as s(status)
join public.ravine_founders f on f.user_id = c.user_id and f.is_active
where c.username = 'ravine'
on conflict (creator_id, status) do update
set is_active = true;

-- Align persisted defaults with the approved Viewer policy. Existing per-user rows are not
-- overwritten, so future founder/creator exceptions remain explicit rather than hidden in defaults.
alter table public.upload_limits alter column shorts_monthly set default 30;
alter table public.upload_limits alter column videos_monthly set default 10;
alter table public.upload_limits alter column podcasts_monthly set default 2;

-- Creator/Founder unlimited policy plus atomic Viewer quota enforcement.
create or replace function public.ravine_enforce_upload_policy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  creator_owner uuid;
  founder boolean := false;
  unlimited boolean := false;
  current_used integer := 0;
  current_limit integer := 0;
begin
  if actor is null then
    raise exception 'RAVINE_AUTH_REQUIRED' using errcode = '42501';
  end if;

  if new.user_id is null then
    new.user_id := actor;
  end if;

  if new.user_id <> actor and not is_ravine_admin() then
    raise exception 'RAVINE_UPLOAD_OWNER_MISMATCH' using errcode = '42501';
  end if;

  select c.user_id into creator_owner
  from public.creators c
  where c.id = new.creator_id;

  founder := exists (
    select 1
    from public.ravine_founders f
    where f.user_id = actor and f.is_active = true
  );

  unlimited := founder or exists (
    select 1
    from public.creators c
    where c.id = new.creator_id and c.user_id = actor
  );

  if new.content_type not in ('short','video','podcast','live','film','documentary') then
    raise exception 'RAVINE_INVALID_CONTENT_TYPE' using errcode = '22023';
  end if;

  -- Live recordings are not treated as a normal Studio upload quota.
  if unlimited or new.content_type = 'live' then
    return new;
  end if;

  insert into public.upload_limits (user_id)
  values (actor)
  on conflict (user_id) do nothing;

  update public.upload_limits
  set shorts_used = case when reset_date <= now() then 0 else shorts_used end,
      videos_used = case when reset_date <= now() then 0 else videos_used end,
      podcasts_used = case when reset_date <= now() then 0 else podcasts_used end,
      reset_date = case when reset_date <= now() then date_trunc('month', now()) + interval '1 month' else reset_date end
  where user_id = actor;

  if new.content_type = 'short' then
    select shorts_used, shorts_monthly into current_used, current_limit
    from public.upload_limits where user_id = actor for update;
    if current_used >= current_limit then
      raise exception 'RAVINE_SHORT_QUOTA_EXCEEDED' using errcode = 'check_violation';
    end if;
    update public.upload_limits set shorts_used = shorts_used + 1 where user_id = actor;
  elsif new.content_type in ('video','film','documentary') then
    select videos_used, videos_monthly into current_used, current_limit
    from public.upload_limits where user_id = actor for update;
    if current_used >= current_limit then
      raise exception 'RAVINE_VIDEO_QUOTA_EXCEEDED' using errcode = 'check_violation';
    end if;
    update public.upload_limits set videos_used = videos_used + 1 where user_id = actor;
  elsif new.content_type = 'podcast' then
    select podcasts_used, podcasts_monthly into current_used, current_limit
    from public.upload_limits where user_id = actor for update;
    if current_used >= current_limit then
      raise exception 'RAVINE_PODCAST_QUOTA_EXCEEDED' using errcode = 'check_violation';
    end if;
    update public.upload_limits set podcasts_used = podcasts_used + 1 where user_id = actor;
  end if;

  return new;
end;
$$;

revoke all on function public.ravine_enforce_upload_policy() from public;

drop trigger if exists ravine_enforce_upload_policy_trigger on public.videos;
create trigger ravine_enforce_upload_policy_trigger
before insert on public.videos
for each row execute function public.ravine_enforce_upload_policy();

-- Expand the work taxonomy already used by StudioUpload without changing existing records.
alter table public.videos
  drop constraint if exists videos_content_type_check;
alter table public.videos
  add constraint videos_content_type_check
  check (content_type = any (array['short','video','podcast','live','film','documentary']));

-- Keep the database quality vocabulary aligned with the Studio UI.
alter table public.videos
  drop constraint if exists videos_quality_check;
alter table public.videos
  add constraint videos_quality_check
  check (quality = any (array['720p','1080p','2k','4k']));

comment on table public.ravine_founders is 'Scoped founder operational entitlement. Does not itself grant private-account access.';
comment on table public.ravine_creator_status_grants is 'Creator-scoped verified/select statuses; separate from account role and founder access.';
