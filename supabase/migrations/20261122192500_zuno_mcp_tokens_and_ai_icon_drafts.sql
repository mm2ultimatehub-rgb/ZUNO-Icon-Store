-- Personal MCP credentials are stored as hashes; raw tokens are shown only once in the browser.
create table if not exists public.zuno_mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 48),
  token_hash text not null unique check (char_length(token_hash) = 64),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists zuno_mcp_tokens_user_idx on public.zuno_mcp_tokens(user_id);
alter table public.zuno_mcp_tokens enable row level security;
revoke all on public.zuno_mcp_tokens from anon;
grant select, insert, delete on public.zuno_mcp_tokens to authenticated;
drop policy if exists "Users read own MCP tokens" on public.zuno_mcp_tokens;
create policy "Users read own MCP tokens" on public.zuno_mcp_tokens for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users create own MCP tokens" on public.zuno_mcp_tokens;
create policy "Users create own MCP tokens" on public.zuno_mcp_tokens for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users revoke own MCP tokens" on public.zuno_mcp_tokens;
create policy "Users revoke own MCP tokens" on public.zuno_mcp_tokens for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.zuno_ai_icon_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 60),
  description text not null default '' check (char_length(description) <= 500),
  category text not null default 'Other' check (category in ('Minimal','Dark','Colorful','Gradient','Other')),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/png','image/jpeg','image/webp')),
  file_size bigint not null check (file_size > 0 and file_size <= 8388608),
  created_at timestamptz not null default now()
);
create index if not exists zuno_ai_icon_drafts_user_idx on public.zuno_ai_icon_drafts(user_id, created_at desc);
alter table public.zuno_ai_icon_drafts enable row level security;
revoke all on public.zuno_ai_icon_drafts from anon, authenticated;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('zuno-ai-drafts', 'zuno-ai-drafts', false, 8388608, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public=false, file_size_limit=8388608, allowed_mime_types=array['image/png','image/jpeg','image/webp'];
