-- RAVINE creator publishing transaction v1.
-- Staged only. Apply only after reviewing the dependency migrations in order.
-- Monthly quotas remain disabled by default because product quota values are provisional.
-- Tier-based content eligibility is enforced by the publishing RPC.

create table if not exists public.ravine_creator_capability_settings (
  setting_key text primary key,
  setting_value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.ravine_creator_capability_settings (setting_key, setting_value)
values ('monthly_quotas_enabled', 'false'::jsonb)
on conflict (setting_key) do nothing;

alter table public.ravine_creator_capability_settings enable row level security;
revoke all on public.ravine_creator_capability_settings from anon, authenticated;

create table if not exists public.ravine_creator_publish_quota_usage (
  id bigint generated always as identity primary key,
  creator_identity_id bigint not null references public.ravine_next_creator_identities(id) on delete cascade,
  work_id bigint not null references public.ravine_next_works(id) on delete cascade,
  work_type text not null check (work_type in ('short','video','podcast','documentary','short_film','feature_film')),
  quota_month date not null,
  created_at timestamptz not null default now(),
  unique (work_id, quota_month)
);
create index if not exists ravine_creator_publish_quota_lookup_idx
  on public.ravine_creator_publish_quota_usage (creator_identity_id, work_type, quota_month);

alter table public.ravine_creator_publish_quota_usage enable row level security;
revoke all on public.ravine_creator_publish_quota_usage from anon, authenticated;

create or replace function public.ravine_publish_creator_work(
  p_work_id bigint,
  p_creator_identity_id bigint,
  p_title text,
  p_description text,
  p_work_type text,
  p_primary_media_url text,
  p_visibility text,
  p_poster_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_tier text;
  v_work_id bigint;
  v_existing_status text;
  v_quota_enabled boolean := false;
  v_month date := date_trunc('month', timezone('utc', now()))::date;
  v_limit integer := null;
  v_used integer := 0;
begin
  if v_actor is null then
    raise exception 'RAVINE_AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_creator_identity_id is null or p_title is null or char_length(trim(p_title)) not between 1 and 200 then
    raise exception 'RAVINE_INVALID_WORK_DETAILS' using errcode = '22023';
  end if;
  if p_work_type not in ('short','video','podcast','documentary','short_film','feature_film') then
    raise exception 'RAVINE_INVALID_CONTENT_TYPE' using errcode = '22023';
  end if;
  if p_primary_media_url is null or char_length(trim(p_primary_media_url)) = 0 then
    raise exception 'RAVINE_MEDIA_REQUIRED' using errcode = '22023';
  end if;
  if p_visibility not in ('public','followers','members','tier','invite_only','private') then
    raise exception 'RAVINE_INVALID_VISIBILITY' using errcode = '22023';
  end if;

  -- Lock the identity row to serialize publishing/quota checks for this identity.
  select creator_tier
    into v_tier
    from public.ravine_next_creator_identities
   where id = p_creator_identity_id
     and owner_user_id = v_actor
   for update;

  if not found then
    raise exception 'RAVINE_CREATOR_IDENTITY_NOT_OWNED' using errcode = '42501';
  end if;

  if v_tier = 'viewer' and p_work_type not in ('short','video') then
    raise exception 'RAVINE_TIER_RESTRICTED' using errcode = '42501';
  elsif v_tier = 'creator' and p_work_type not in ('short','video','short_film','feature_film') then
    raise exception 'RAVINE_TIER_RESTRICTED' using errcode = '42501';
  end if;

  if p_work_id is not null then
    select status into v_existing_status
      from public.ravine_next_works
     where id = p_work_id
       and creator_identity_id = p_creator_identity_id
     for update;
    if not found then
      raise exception 'RAVINE_WORK_NOT_OWNED' using errcode = '42501';
    end if;
    v_work_id := p_work_id;
    update public.ravine_next_works
       set title = trim(p_title),
           description = nullif(trim(coalesce(p_description, '')), ''),
           work_type = p_work_type,
           status = 'published',
           visibility = p_visibility,
           primary_media_url = trim(p_primary_media_url),
           poster_url = nullif(trim(coalesce(p_poster_url, '')), ''),
           published_at = now(),
           updated_at = now()
     where id = v_work_id;
  else
    insert into public.ravine_next_works (
      creator_identity_id, title, description, work_type, status,
      visibility, primary_media_url, poster_url, published_at
    ) values (
      p_creator_identity_id, trim(p_title),
      nullif(trim(coalesce(p_description, '')), ''),
      p_work_type, 'published', p_visibility,
      trim(p_primary_media_url),
      nullif(trim(coalesce(p_poster_url, '')), ''), now()
    )
    returning id into v_work_id;
  end if;

  select coalesce((setting_value #>> '{}')::boolean, false)
    into v_quota_enabled
    from public.ravine_creator_capability_settings
   where setting_key = 'monthly_quotas_enabled';
  v_quota_enabled := coalesce(v_quota_enabled, false);

  -- Policy limits are centralized here and are gated off until the product
  -- explicitly approves the provisional numbers and enables the setting.
  if v_tier = 'viewer' and p_work_type = 'video' then
    v_limit := 10;
  elsif v_tier = 'creator' and p_work_type = 'short_film' then
    v_limit := 2;
  elsif v_tier = 'creator' and p_work_type = 'feature_film' then
    v_limit := 1;
  elsif v_tier = 'elevated_creator' and p_work_type in ('podcast','documentary') then
    v_limit := 5;
  elsif v_tier = 'elevated_creator' and p_work_type = 'short_film' then
    v_limit := 2;
  elsif v_tier = 'elevated_creator' and p_work_type = 'feature_film' then
    v_limit := 1;
  elsif v_tier = 'artist' and p_work_type = 'feature_film' then
    v_limit := 3;
  end if;

  if v_quota_enabled and v_limit is not null
     and not exists (
       select 1
         from public.ravine_creator_publish_quota_usage
        where work_id = v_work_id
          and quota_month = v_month
     ) then
    select count(*)::integer into v_used
      from public.ravine_creator_publish_quota_usage
     where creator_identity_id = p_creator_identity_id
       and work_type = p_work_type
       and quota_month = v_month;
    if v_used >= v_limit then
      raise exception 'RAVINE_MONTHLY_QUOTA_REACHED' using errcode = 'check_violation';
    end if;
  end if;

  insert into public.ravine_creator_publish_quota_usage (
    creator_identity_id, work_id, work_type, quota_month
  ) values (p_creator_identity_id, v_work_id, p_work_type, v_month)
  on conflict (work_id, quota_month) do update
    set creator_identity_id = excluded.creator_identity_id,
        work_type = excluded.work_type;

  return jsonb_build_object(
    'ok', true,
    'work_id', v_work_id,
    'creator_identity_id', p_creator_identity_id,
    'creator_tier', v_tier,
    'work_type', p_work_type,
    'monthly_quotas_enforced', v_quota_enabled
  );
end;
$$;

revoke all on function public.ravine_publish_creator_work(bigint,bigint,text,text,text,text,text,text) from public;
grant execute on function public.ravine_publish_creator_work(bigint,bigint,text,text,text,text,text,text) to authenticated;

comment on function public.ravine_publish_creator_work(bigint,bigint,text,text,text,text,text,text) is
  'Authenticated, identity-owned publish transaction. Enforces tier content eligibility. Monthly quota limits are provisioned but disabled by default until approved.';
