alter table public.ravine_hero_media_items
  drop constraint if exists ravine_hero_media_type_source_check;

alter table public.ravine_hero_media_items
  add constraint ravine_hero_media_type_source_check
  check (
    (media_type = 'video') or
    (media_type = 'image' and video_id is null)
  );

comment on column public.ravine_hero_media_items.video_id is
  'Optional link to a published RAVINE video. NULL means this is a hero-only uploaded video.';
