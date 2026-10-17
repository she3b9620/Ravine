-- RAVINE series content type.
-- Series work follows the same account/creator ownership controls as other visual work.
-- Viewer uploads share the existing monthly Video quota; owner-creators and Founders remain unlimited.

create or replace function public.ravine_enforce_upload_policy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
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

  if new.content_type not in ('short','video','podcast','live','film','documentary','series') then
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
  elsif new.content_type in ('video','film','documentary','series') then
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

alter table public.videos
  drop constraint if exists videos_content_type_check;

alter table public.videos
  add constraint videos_content_type_check
  check (content_type = any (array['short','video','podcast','live','film','documentary','series']));

comment on function public.ravine_enforce_upload_policy() is
  'Enforces existing RAVINE creator ownership and monthly upload policy; series uses the regular Video quota.';
