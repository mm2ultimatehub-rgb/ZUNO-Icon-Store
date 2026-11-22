alter table public.profiles
  drop constraint if exists profiles_bio_length_check;
alter table public.profiles
  add constraint profiles_bio_length_check
  check (char_length(bio) <= 300);

alter table public.zuno_icons
  drop constraint if exists zuno_icons_category_allowed_check;
alter table public.zuno_icons
  add constraint zuno_icons_category_allowed_check
  check (category in ('Minimal', 'Dark', 'Colorful', 'Gradient', 'Other'));

alter table public.zuno_icons
  drop constraint if exists zuno_icons_storage_owner_path_check;
alter table public.zuno_icons
  add constraint zuno_icons_storage_owner_path_check
  check (storage_path like user_id::text || '/%');
