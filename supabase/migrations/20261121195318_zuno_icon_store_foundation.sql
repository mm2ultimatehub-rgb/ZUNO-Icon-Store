create table if not exists public.zuno_icons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 60),
  description text not null default '' check (char_length(description) <= 500),
  category text not null default 'Other' check (char_length(category) <= 32),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/png','image/webp','image/svg+xml')),
  file_size bigint not null check (file_size > 0 and file_size <= 5242880),
  downloads integer not null default 0 check (downloads >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists zuno_icons_created_at_idx on public.zuno_icons(created_at desc);
create index if not exists zuno_icons_category_idx on public.zuno_icons(category);
alter table public.zuno_icons enable row level security;
grant select on public.zuno_icons to anon, authenticated;
grant insert, update, delete on public.zuno_icons to authenticated;
drop policy if exists "Public ZUNO icons are readable" on public.zuno_icons;
create policy "Public ZUNO icons are readable" on public.zuno_icons for select to anon, authenticated using (true);
drop policy if exists "Users add own ZUNO icons" on public.zuno_icons;
create policy "Users add own ZUNO icons" on public.zuno_icons for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own ZUNO icons" on public.zuno_icons;
create policy "Users update own ZUNO icons" on public.zuno_icons for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete own ZUNO icons" on public.zuno_icons;
create policy "Users delete own ZUNO icons" on public.zuno_icons for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.zuno_icon_likes (
  icon_id uuid not null references public.zuno_icons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (icon_id, user_id)
);
alter table public.zuno_icon_likes enable row level security;
grant select on public.zuno_icon_likes to anon, authenticated;
grant insert, delete on public.zuno_icon_likes to authenticated;
drop policy if exists "ZUNO likes are public" on public.zuno_icon_likes;
create policy "ZUNO likes are public" on public.zuno_icon_likes for select to anon, authenticated using (true);
drop policy if exists "Users like as themselves" on public.zuno_icon_likes;
create policy "Users like as themselves" on public.zuno_icon_likes for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users remove own ZUNO likes" on public.zuno_icon_likes;
create policy "Users remove own ZUNO likes" on public.zuno_icon_likes for delete to authenticated using ((select auth.uid()) = user_id);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles' and policyname='Users create own profile'
  ) then
    create policy "Users create own profile" on public.profiles
      for insert to authenticated with check ((select auth.uid()) = id);
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('zuno-icons', 'zuno-icons', true, 5242880, array['image/png','image/webp','image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists "ZUNO icons are publicly readable" on storage.objects;
create policy "ZUNO icons are publicly readable" on storage.objects for select to anon, authenticated using (bucket_id = 'zuno-icons');
drop policy if exists "Users upload own ZUNO icons" on storage.objects;
create policy "Users upload own ZUNO icons" on storage.objects for insert to authenticated with check (bucket_id = 'zuno-icons' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Users delete own ZUNO icons" on storage.objects;
create policy "Users delete own ZUNO icons" on storage.objects for delete to authenticated using (bucket_id = 'zuno-icons' and (storage.foldername(name))[1] = (select auth.uid())::text);
