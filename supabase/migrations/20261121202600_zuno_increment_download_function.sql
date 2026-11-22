create or replace function public.zuno_increment_download(p_icon_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.zuno_icons set downloads = downloads + 1 where id = p_icon_id;
$$;
revoke all on function public.zuno_increment_download(uuid) from public;
grant execute on function public.zuno_increment_download(uuid) to anon, authenticated;
