-- Two AFTER INSERT triggers on auth.users (handle_new_user and zuno_create_profile_for_new_user)
-- both insert the same profiles row, so the second one fails with a duplicate key and blocks sign-ups.
-- Make the ZUNO trigger function idempotent; behaviour is otherwise unchanged.
create or replace function public.zuno_create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  requested_username text;
begin
  requested_username := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if requested_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Username must be 3-24 characters (a-z, 0-9, underscore)';
  end if;
  insert into public.profiles (id, username, bio)
  values (new.id, requested_username, '')
  on conflict (id) do nothing;
  return new;
end;
$function$;
