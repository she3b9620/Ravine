-- Optimize the new series-title table's ownership policies and index its user foreign key.
drop policy if exists ravine_series_titles_select_owner_or_public on public.ravine_series_titles;
create policy ravine_series_titles_select_owner_or_public
on public.ravine_series_titles
for select
to anon, authenticated
using (
  ((select auth.uid()) is not null and user_id = (select auth.uid()))
  or (published = true and visibility = 'public')
);

drop policy if exists ravine_series_titles_owner_insert on public.ravine_series_titles;
create policy ravine_series_titles_owner_insert
on public.ravine_series_titles
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.creators c
    where c.id = creator_id and c.user_id = (select auth.uid())
  )
);

drop policy if exists ravine_series_titles_owner_update on public.ravine_series_titles;
create policy ravine_series_titles_owner_update
on public.ravine_series_titles
for update
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.creators c
    where c.id = creator_id and c.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.creators c
    where c.id = creator_id and c.user_id = (select auth.uid())
  )
);

drop policy if exists ravine_series_titles_owner_delete on public.ravine_series_titles;
create policy ravine_series_titles_owner_delete
on public.ravine_series_titles
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.creators c
    where c.id = creator_id and c.user_id = (select auth.uid())
  )
);

create index if not exists ravine_series_titles_user_idx
on public.ravine_series_titles(user_id, created_at desc);
