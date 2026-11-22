do $$
begin
  if not exists (select 1 from pg_constraint where conname='zuno_icons_user_profile_fkey') then
    alter table public.zuno_icons
      add constraint zuno_icons_user_profile_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;
