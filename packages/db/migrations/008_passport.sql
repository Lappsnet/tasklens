-- TaskLens S3: Home Passport. Share tokens are random 32-byte values; store only SHA-256.

create table if not exists homes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id),
  label text not null default 'Mi hogar',
  address text default '',
  created_at timestamptz default now()
);

create table if not exists home_members (
  id uuid primary key default gen_random_uuid(),
  home_id uuid references homes(id) on delete cascade,
  user_id uuid references profiles(id),
  role text not null default 'member' check (role in ('owner','member')),
  unique(home_id, user_id)
);

create table if not exists passport_entries (
  id uuid primary key default gen_random_uuid(),
  home_id uuid references homes(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  category text not null,
  title text not null,
  before_photo text,
  after_photo text,
  contract_id uuid references contracts(id),
  materials text[] default '{}',
  pro_id uuid references pros(id),
  warranty_until date,
  ai_summary text default '',
  created_at timestamptz default now()
);

create table if not exists warranties (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references passport_entries(id) on delete cascade,
  job_id uuid references jobs(id),
  reason text default '',
  status text not null default 'open' check (status in ('open','fixed','expired')),
  created_at timestamptz default now()
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  home_id uuid references homes(id) on delete cascade,
  entry_id uuid references passport_entries(id) on delete set null,
  title text not null,
  due_on date not null,
  channel text not null default 'in_app',
  done boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists passport_shares (
  id uuid primary key default gen_random_uuid(),
  home_id uuid references homes(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null,
  revoked boolean not null default false
);

alter table homes enable row level security;
alter table home_members enable row level security;
alter table passport_entries enable row level security;
alter table warranties enable row level security;
alter table reminders enable row level security;
alter table passport_shares enable row level security;

-- Owner or member reads everything in their home; writes via service role.
drop policy if exists "homes members read" on homes;
create policy "homes members read" on homes
  for select using (
    owner_id = auth.uid() or exists (select 1 from home_members m where m.home_id = homes.id and m.user_id = auth.uid())
  );

drop policy if exists "entries home read" on passport_entries;
create policy "entries home read" on passport_entries
  for select using (
    exists (
      select 1 from homes h
      left join home_members m on m.home_id = h.id
      where h.id = passport_entries.home_id
        and (h.owner_id = auth.uid() or m.user_id = auth.uid())
    )
  );

drop policy if exists "warranties home read" on warranties;
create policy "warranties home read" on warranties
  for select using (
    exists (
      select 1 from passport_entries e
      join homes h on h.id = e.home_id
      left join home_members m on m.home_id = h.id
      where e.id = warranties.entry_id
        and (h.owner_id = auth.uid() or m.user_id = auth.uid())
    )
  );

drop policy if exists "reminders home read" on reminders;
create policy "reminders home read" on reminders
  for select using (
    exists (
      select 1 from homes h
      left join home_members m on m.home_id = h.id
      where h.id = reminders.home_id
        and (h.owner_id = auth.uid() or m.user_id = auth.uid())
    )
  );
