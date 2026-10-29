-- TaskLens S2: Smart Calendar. Tokens are random 32-byte values; store only SHA-256.

create table if not exists calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid references pros(id) on delete cascade,
  user_id uuid references profiles(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind text not null default 'busy' check (kind in ('busy','recurring','buffer','zone')),
  note text default '',
  created_at timestamptz default now()
);

create table if not exists calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  token_hash text unique not null,
  revoked boolean not null default false,
  created_at timestamptz default now()
);

alter table calendar_blocks enable row level security;
alter table calendar_feeds enable row level security;

-- Owners manage their own blocks/feeds. Writes via service role after session checks.
drop policy if exists "blocks owner all" on calendar_blocks;
create policy "blocks owner all" on calendar_blocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "feeds owner all" on calendar_feeds;
create policy "feeds owner all" on calendar_feeds
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
