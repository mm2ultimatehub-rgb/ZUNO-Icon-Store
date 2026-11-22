-- Raise ZUNO icon uploads from the original 5 MB database/storage cap to 40 MB.
alter table public.zuno_icons
  drop constraint if exists zuno_icons_file_size_check;
alter table public.zuno_icons
  add constraint zuno_icons_file_size_check
  check (file_size is null or (file_size > 0 and file_size <= 41943040));

update storage.buckets
set file_size_limit = 41943040
where id = 'zuno-icons';
