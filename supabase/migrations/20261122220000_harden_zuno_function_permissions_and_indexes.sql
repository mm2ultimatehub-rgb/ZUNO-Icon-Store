-- Restrict privileged database functions and index ownership lookups.
-- zuno_create_profile_for_new_user remains callable by the trigger mechanism only.
-- zuno_increment_download is reserved for trusted server-side callers.

REVOKE ALL ON FUNCTION public.zuno_create_profile_for_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.zuno_increment_download(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.zuno_increment_download(uuid) TO service_role;

CREATE INDEX IF NOT EXISTS zuno_icons_user_id_idx ON public.zuno_icons(user_id);
CREATE INDEX IF NOT EXISTS zuno_icon_likes_user_id_idx ON public.zuno_icon_likes(user_id);
