create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  avatar_url text,
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username = lower(username) and username ~ '^[a-z0-9_]{3,24}$')
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 5000),
  content text,
  category text not null default 'other',
  visibility text not null default 'public' check (visibility = 'public'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_files (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size bigint not null default 0 check (file_size >= 0 and file_size <= 26214400),
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_user_id_idx on public.posts (user_id);
create index if not exists post_files_post_id_idx on public.post_files (post_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  requested_username := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  if requested_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Username must be 3-24 characters and contain only letters, numbers, and underscores';
  end if;
  insert into public.profiles (id, username)
  values (new.id, requested_username);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_files enable row level security;

drop policy if exists "Public profiles are readable" on public.profiles;
create policy "Public profiles are readable"
  on public.profiles for select using (true);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Public posts are readable" on public.posts;
create policy "Public posts are readable"
  on public.posts for select using (visibility = 'public');

drop policy if exists "Users create own posts" on public.posts;
create policy "Users create own posts"
  on public.posts for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own posts" on public.posts;
create policy "Users update own posts"
  on public.posts for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete own posts" on public.posts;
create policy "Users delete own posts"
  on public.posts for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Public post files are readable" on public.post_files;
create policy "Public post files are readable"
  on public.post_files for select using (
    exists (select 1 from public.posts p where p.id = post_id and p.visibility = 'public')
  );

drop policy if exists "Users attach own files" on public.post_files;
create policy "Users attach own files"
  on public.post_files for insert to authenticated
  with check (
    auth.uid() = user_id and
    exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
  );

drop policy if exists "Users delete own file records" on public.post_files;
create policy "Users delete own file records"
  on public.post_files for delete to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-files',
  'community-files',
  true,
  26214400,
  array[
    'image/png','image/jpeg','image/webp','image/gif','image/svg+xml',
    'application/zip','application/x-zip-compressed','application/pdf',
    'text/plain','text/markdown','text/html','text/css','text/javascript',
    'application/javascript','application/json','application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Community files are publicly readable" on storage.objects;
create policy "Community files are publicly readable"
  on storage.objects for select using (bucket_id = 'community-files');

drop policy if exists "Users upload into own folder" on storage.objects;
create policy "Users upload into own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'community-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete files from own folder" on storage.objects;
create policy "Users delete files from own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'community-files' and (storage.foldername(name))[1] = auth.uid()::text);
