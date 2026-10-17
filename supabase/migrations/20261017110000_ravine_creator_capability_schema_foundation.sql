-- RAVINE Creator Capability Schema Foundation v1
-- STAGED ONLY: do not apply to Production until reviewed and explicitly approved.
-- Depends on 20260907120000_ravine_platform_domain_foundation.sql.
-- This migration adds persisted tier data and the full work-type vocabulary.
-- It intentionally does NOT enforce provisional quotas yet.

alter table public.ravine_next_creator_identities
  add column if not exists creator_tier text not null default 'viewer';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ravine_next_creator_identities'::regclass
      and conname = 'ravine_next_creator_tier_check'
  ) then
    alter table public.ravine_next_creator_identities
      add constraint ravine_next_creator_tier_check
      check (creator_tier in ('viewer', 'creator', 'elevated_creator', 'artist', 'elevated_artist'));
  end if;
end
$$;

-- Expand only the known work_type check constraint. Avoid dropping unrelated
-- check constraints that may happen to reference this column.
alter table public.ravine_next_works
  drop constraint if exists ravine_next_works_work_type_check;

alter table public.ravine_next_works
  add constraint ravine_next_works_work_type_check
  check (work_type in (
    'short',
    'video',
    'podcast',
    'documentary',
    'short_film',
    'feature_film',
    'film',
    'photography',
    'motion_vfx',
    'audio',
    'music',
    'series_episode',
    'gaming',
    'other'
  ));

create index if not exists ravine_next_creator_tier_idx
  on public.ravine_next_creator_identities(creator_tier);

comment on column public.ravine_next_creator_identities.creator_tier is
  'RAVINE capability tier for this creator identity. Set only through trusted administrative/server-side workflows; never trust client-provided tier values.';

comment on constraint ravine_next_creator_tier_check
  on public.ravine_next_creator_identities is
  'Allowed tiers: viewer, creator, elevated_creator, artist, elevated_artist.';

-- Quota policy is deliberately not enforced by this migration because some
-- monthly limits are still provisional. Before enforcement, add a database
-- transaction/locking strategy to prevent concurrent publishes exceeding quota,
-- define the platform timezone and treatment of scheduled/edited publications,
-- and test all work-type transitions and identity ownership paths.
