create table if not exists public.creator_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  specialties text[] not null default '{}',
  work_samples jsonb not null default '[]'::jsonb,
  bio text not null default '',
  experience text not null default '',
  tools text[] not null default '{}',
  portfolio_links text[] not null default '{}',
  agreed_originality boolean not null default false,
  agreed_copyright boolean not null default false,
  agreed_standards boolean not null default false,
  agreed_no_spam boolean not null default false,
  agreed_credits boolean not null default false,
  status text not null default 'pending' check (status in ('pending','reviewing','approved','rejected','withdrawn')),
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists creator_applications_active_user_idx
  on public.creator_applications(user_id)
  where status in ('pending','reviewing');

create index if not exists creator_applications_status_idx
  on public.creator_applications(status, created_at desc);

create index if not exists creator_applications_user_created_idx
  on public.creator_applications(user_id, created_at desc);

alter table public.creator_applications enable row level security;

drop policy if exists "creator applications select own" on public.creator_applications;
drop policy if exists "creator applications insert own" on public.creator_applications;
drop policy if exists "creator applications update own" on public.creator_applications;

grant select, insert, update on public.creator_applications to authenticated;

create policy "creator applications select own"
  on public.creator_applications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "creator applications insert own"
  on public.creator_applications
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "creator applications update own"
  on public.creator_applications
  for update
  to authenticated
  using ((select auth.uid()) = user_id and status = 'pending')
  with check ((select auth.uid()) = user_id and status = 'pending');

create or replace function public.set_creator_applications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists creator_applications_updated_at on public.creator_applications;
create trigger creator_applications_updated_at
before update on public.creator_applications
for each row execute function public.set_creator_applications_updated_at();