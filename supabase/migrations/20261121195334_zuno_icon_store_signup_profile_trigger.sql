create or replace function public.zuno_create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  requested_username := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if requested_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Username must be 3-24 characters (a-z, 0-9, underscore)';
  end if;
  insert into public.profiles (id, username, bio)
  values (new.id, requested_username, '');
  return new;
end;
$$;

drop trigger if exists zuno_on_auth_user_created on auth.users;
create trigger zuno_on_auth_user_created
after insert on auth.users
for each row execute function public.zuno_create_profile_for_new_user();
