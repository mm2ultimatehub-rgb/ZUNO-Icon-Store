alter table public.zuno_icon_download_events
  drop constraint if exists zuno_icon_download_events_daily_unique;

alter table public.zuno_icon_download_events
  add constraint zuno_icon_download_events_pkey
  primary key (icon_id, fingerprint, download_day);

create policy "Service role manages download event rate limits"
  on public.zuno_icon_download_events
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists zuno_icon_download_events_created_at_idx
  on public.zuno_icon_download_events(created_at);
