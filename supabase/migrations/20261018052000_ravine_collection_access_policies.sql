-- RAVINE Collections & Boards access rules.
-- Public boards are readable; private and members-only boards are restricted to their owner
-- until membership eligibility and member entitlement rules are explicitly finalized.
-- Only published public video work can be added by the current UI.
alter table public.ravine_collections enable row level security;
alter table public.ravine_collection_items enable row level security;

drop policy if exists ravine_collections_public_or_owner_read on public.ravine_collections;
create policy ravine_collections_public_or_owner_read
on public.ravine_collections for select to anon, authenticated
using (
  visibility = 'public'
  or owner_user_id = (select auth.uid())
  or exists (
    select 1 from public.creators c
    where c.id = owner_creator_id
      and c.user_id = (select auth.uid())
  )
);

drop policy if exists ravine_collections_user_insert on public.ravine_collections;
create policy ravine_collections_user_insert
on public.ravine_collections for insert to authenticated
with check (owner_user_id = (select auth.uid()) and owner_creator_id is null);

drop policy if exists ravine_collections_owner_update on public.ravine_collections;
create policy ravine_collections_owner_update
on public.ravine_collections for update to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (
    select 1 from public.creators c
    where c.id = owner_creator_id and c.user_id = (select auth.uid())
  )
)
with check (
  owner_user_id = (select auth.uid())
  or exists (
    select 1 from public.creators c
    where c.id = owner_creator_id and c.user_id = (select auth.uid())
  )
);

drop policy if exists ravine_collections_owner_delete on public.ravine_collections;
create policy ravine_collections_owner_delete
on public.ravine_collections for delete to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (
    select 1 from public.creators c
    where c.id = owner_creator_id and c.user_id = (select auth.uid())
  )
);

drop policy if exists ravine_collection_items_public_or_owner_read on public.ravine_collection_items;
create policy ravine_collection_items_public_or_owner_read
on public.ravine_collection_items for select to anon, authenticated
using (
  exists (
    select 1 from public.ravine_collections rc
    where rc.id = collection_id
      and (
        rc.visibility = 'public'
        or rc.owner_user_id = (select auth.uid())
        or exists (
          select 1 from public.creators c
          where c.id = rc.owner_creator_id and c.user_id = (select auth.uid())
        )
      )
  )
  and (
    (work_id is not null and exists (
      select 1 from public.videos v
      where v.id = work_id and v.published = true and v.visibility = 'public'
    ))
    or (creator_id is not null and exists (
      select 1 from public.creators c where c.id = creator_id
    ))
    or (community_id is not null and exists (
      select 1 from public.communities c
      where c.id = community_id and c.is_active = true and c.privacy = 'public'
    ))
  )
);

drop policy if exists ravine_collection_items_owner_insert_public_work on public.ravine_collection_items;
create policy ravine_collection_items_owner_insert_public_work
on public.ravine_collection_items for insert to authenticated
with check (
  work_id is not null and creator_id is null and community_id is null
  and exists (
    select 1 from public.videos v
    where v.id = work_id and v.published = true and v.visibility = 'public'
  )
  and exists (
    select 1 from public.ravine_collections rc
    where rc.id = collection_id
      and (
        rc.owner_user_id = (select auth.uid())
        or exists (
          select 1 from public.creators c
          where c.id = rc.owner_creator_id and c.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists ravine_collection_items_owner_delete on public.ravine_collection_items;
create policy ravine_collection_items_owner_delete
on public.ravine_collection_items for delete to authenticated
using (
  exists (
    select 1 from public.ravine_collections rc
    where rc.id = collection_id
      and (
        rc.owner_user_id = (select auth.uid())
        or exists (
          select 1 from public.creators c
          where c.id = rc.owner_creator_id and c.user_id = (select auth.uid())
        )
      )
  )
);

grant select on public.ravine_collections, public.ravine_collection_items to anon, authenticated;
grant insert, update, delete on public.ravine_collections, public.ravine_collection_items to authenticated;
