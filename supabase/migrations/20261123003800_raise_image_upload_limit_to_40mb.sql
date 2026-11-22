update storage.buckets
set file_size_limit = 41943040
where id in ('zuno-ai-drafts', 'community-files');

alter table public.post_files
  drop constraint if exists post_files_file_size_check;

alter table public.post_files
  add constraint post_files_file_size_check
  check (file_size >= 0 and file_size <= 41943040);
