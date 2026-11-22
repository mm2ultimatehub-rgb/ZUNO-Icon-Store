-- Grant the verified owner account administrator privileges and enforce a 1 GiB bucket cap.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
where lower(email) = lower('huseynoveleddin87@gmail.com');

do $$
begin
  if not exists (
    select 1 from auth.users
    where lower(email) = lower('huseynoveleddin87@gmail.com')
  ) then
    raise exception 'Admin account huseynoveleddin87@gmail.com was not found';
  end if;
end
$$;

drop policy if exists "Admins can delete any ZUNO icon" on public.zuno_icons;
create policy "Admins can delete any ZUNO icon"
on public.zuno_icons for delete to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can delete any ZUNO icon file" on storage.objects;
create policy "Admins can delete any ZUNO icon file"
on storage.objects for delete to authenticated
using (
  bucket_id = 'zuno-icons'
  and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.enforce_zuno_storage_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  used_bytes bigint := 0;
  new_bytes bigint := coalesce((new.metadata ->> 'size')::bigint, 0);
  max_bytes constant bigint := 1073741824;
begin
  if new.bucket_id <> 'zuno-icons' then
    return new;
  end if;

  perform pg_advisory_xact_lock(7319, 20261122);

  if tg_op = 'UPDATE' then
    select coalesce(sum(coalesce((o.metadata ->> 'size')::bigint, 0)), 0)
      into used_bytes
      from storage.objects o
      where o.bucket_id = 'zuno-icons'
        and not (o.name = old.name and o.bucket_id = old.bucket_id);
  else
    select coalesce(sum(coalesce((o.metadata ->> 'size')::bigint, 0)), 0)
      into used_bytes
      from storage.objects o
      where o.bucket_id = 'zuno-icons';
  end if;

  if new_bytes < 0 or used_bytes + new_bytes > max_bytes then
    raise exception 'ZUNO storage limit reached: maximum total storage is 1 GiB'
      using errcode = '54000';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_zuno_storage_cap() from public, anon, authenticated;
drop trigger if exists enforce_zuno_storage_cap on storage.objects;
create trigger enforce_zuno_storage_cap
before insert or update of bucket_id, name, metadata on storage.objects
for each row execute function private.enforce_zuno_storage_cap();
