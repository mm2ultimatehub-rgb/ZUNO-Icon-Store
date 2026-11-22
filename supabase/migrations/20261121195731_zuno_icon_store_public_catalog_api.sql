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
  'https://jlyinisqhkupddyfcdut.supabase.co/storage/v1/object/public/zuno-icons/' || i.storage_path as asset_url,
  coalesce(l.like_count, 0)::integer as like_count
from public.zuno_icons i
join public.profiles p on p.id = i.user_id
left join (
  select icon_id, count(*) as like_count
  from public.zuno_icon_likes
  group by icon_id
) l on l.icon_id = i.id;
grant select on public.zuno_icon_catalog to anon, authenticated;
