alter table public.zuno_icons
  drop constraint if exists zuno_icons_mime_type_check;

alter table public.zuno_icons
  add constraint zuno_icons_mime_type_check
  check (mime_type in ('image/png','image/jpeg','image/webp','image/svg+xml'));
