alter table public.zuno_icons
  add column if not exists source_url text,
  add column if not exists external_image_url text;

alter table public.zuno_icons alter column storage_path drop not null;
alter table public.zuno_icons alter column file_size drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'zuno_icons_external_image_host_check'
      and conrelid = 'public.zuno_icons'::regclass
  ) then
    alter table public.zuno_icons
      add constraint zuno_icons_external_image_host_check
      check (external_image_url is null or external_image_url ~ '^https://i[.]pinimg[.]com/');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'zuno_icons_source_url_host_check'
      and conrelid = 'public.zuno_icons'::regclass
  ) then
    alter table public.zuno_icons
      add constraint zuno_icons_source_url_host_check
      check (source_url is null or source_url ~ '^https://(pin[.]it/|([a-z0-9-]+[.])?pinterest[.]com/)');
  end if;
end $$;

create or replace view public.zuno_icon_catalog
with (security_invoker = true)
as
select
  i.id,
  i.title,
  i.description,
  i.category,
  i.storage_path,
  i.mime_type,
  i.file_size,
  i.downloads,
  i.created_at,
  p.username,
  coalesce(
    i.external_image_url,
    'https://jlyinisqhkupddyfcdut.supabase.co/storage/v1/object/public/zuno-icons/' || i.storage_path
  ) as asset_url,
  coalesce(l.like_count, 0)::integer as like_count
from public.zuno_icons i
join public.profiles p on p.id = i.user_id
left join (
  select icon_id, count(*) as like_count
  from public.zuno_icon_likes
  group by icon_id
) l on l.icon_id = i.id;

grant select on public.zuno_icon_catalog to anon, authenticated;
