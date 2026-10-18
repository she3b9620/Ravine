-- Public read URLs are required because hero assets appear on the guest landing page.
-- Only RAVINE administrators can add objects to this dedicated bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ravine-hero-media',
  'ravine-hero-media',
  true,
  2147483648,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-matroska',
    'video/x-m4v'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "RAVINE administrators can upload hero media" on storage.objects;

create policy "RAVINE administrators can upload hero media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ravine-hero-media'
  and public.is_ravine_admin()
);
