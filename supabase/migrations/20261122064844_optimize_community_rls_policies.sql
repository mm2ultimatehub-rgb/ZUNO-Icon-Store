drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users create own posts" on public.posts;
create policy "Users create own posts"
  on public.posts for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own posts" on public.posts;
create policy "Users update own posts"
  on public.posts for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own posts" on public.posts;
create policy "Users delete own posts"
  on public.posts for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users attach own files" on public.post_files;
create policy "Users attach own files"
  on public.post_files for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users delete own file records" on public.post_files;
create policy "Users delete own file records"
  on public.post_files for delete to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists post_files_user_id_idx on public.post_files(user_id);
