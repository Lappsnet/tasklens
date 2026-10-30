-- TaskLens U3: Meta glasses pairing codes (phone app <-> web account linking).
-- 6-char codes, hash only, single use, 10-minute expiry. Default deny; service role only.

create table if not exists glasses_pairings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  code_hash text unique not null,
  device_label text default '',
  status text not null default 'waiting' check (status in ('waiting','phone_connected','glasses_ready','claimed','expired')),
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

alter table glasses_pairings enable row level security;

-- No read/write policies for anon or authenticated: the browser polls its own
-- pairing through a rate-limited server route, the companion app claims with
-- the user's token server-side. Default deny stands.
