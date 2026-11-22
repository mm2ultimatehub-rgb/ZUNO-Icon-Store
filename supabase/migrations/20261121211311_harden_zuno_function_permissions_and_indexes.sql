revoke all on function public.zuno_create_profile_for_new_user() from public, anon, authenticated;
revoke all on function public.zuno_increment_download(uuid) from public, anon, authenticated;
grant execute on function public.zuno_increment_download(uuid) to service_role;

create index if not exists zuno_icons_user_id_idx on public.zuno_icons(user_id);
create index if not exists zuno_icon_likes_user_id_idx on public.zuno_icon_likes(user_id);
