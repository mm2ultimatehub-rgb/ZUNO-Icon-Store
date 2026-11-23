insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('zuno-promo-videos','zuno-promo-videos',true,41943040,array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.zuno_site_promo (
 id text primary key default 'main' check(id='main'),
 title text not null default 'ZUNO Icon Store',
 description text not null default '',
 video_url text,
 storage_path text,
 is_published boolean not null default false,
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 constraint zuno_site_promo_video_source check(video_url is null or storage_path is null)
);
alter table public.zuno_site_promo enable row level security;
grant select,insert,update,delete on public.zuno_site_promo to anon,authenticated;
drop policy if exists "Public can read published ZUNO promo" on public.zuno_site_promo;
create policy "Public can read published ZUNO promo" on public.zuno_site_promo for select to anon,authenticated using(is_published=true);
drop policy if exists "Admins can read all ZUNO promo settings" on public.zuno_site_promo;
create policy "Admins can read all ZUNO promo settings" on public.zuno_site_promo for select to authenticated using((select auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists "Admins can insert ZUNO promo settings" on public.zuno_site_promo;
create policy "Admins can insert ZUNO promo settings" on public.zuno_site_promo for insert to authenticated with check((select auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists "Admins can update ZUNO promo settings" on public.zuno_site_promo;
create policy "Admins can update ZUNO promo settings" on public.zuno_site_promo for update to authenticated using((select auth.jwt()->'app_metadata'->>'role')='admin') with check((select auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists "Admins can delete ZUNO promo settings" on public.zuno_site_promo;
create policy "Admins can delete ZUNO promo settings" on public.zuno_site_promo for delete to authenticated using((select auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists "Public can view ZUNO promo video files" on storage.objects;
create policy "Public can view ZUNO promo video files" on storage.objects for select to anon,authenticated using(bucket_id='zuno-promo-videos');
drop policy if exists "Admins can upload ZUNO promo video files" on storage.objects;
create policy "Admins can upload ZUNO promo video files" on storage.objects for insert to authenticated with check(bucket_id='zuno-promo-videos' and (select auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists "Admins can update ZUNO promo video files" on storage.objects;
create policy "Admins can update ZUNO promo video files" on storage.objects for update to authenticated using(bucket_id='zuno-promo-videos' and (select auth.jwt()->'app_metadata'->>'role')='admin') with check(bucket_id='zuno-promo-videos' and (select auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists "Admins can delete ZUNO promo video files" on storage.objects;
create policy "Admins can delete ZUNO promo video files" on storage.objects for delete to authenticated using(bucket_id='zuno-promo-videos' and (select auth.jwt()->'app_metadata'->>'role')='admin');