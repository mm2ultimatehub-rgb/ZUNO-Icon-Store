create table if not exists public.zuno_icon_download_events (
  icon_id uuid not null references public.zuno_icons(id) on delete cascade,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  download_day date not null,
  created_at timestamptz not null default now(),
  constraint zuno_icon_download_events_daily_unique unique (icon_id, fingerprint, download_day)
);

alter table public.zuno_icon_download_events enable row level security;
revoke all on table public.zuno_icon_download_events from public, anon, authenticated;
grant select, insert, delete on table public.zuno_icon_download_events to service_role;
