-- TaskLens Day 1 schema (Supabase Postgres + RLS)
-- Job status enum: quoted, booked, en_route, in_progress, pending_verify, completed, disputed

create extension if not exists "pgcrypto";

do $$ begin
  create type job_status as enum ('quoted','booked','en_route','in_progress','pending_verify','completed','disputed');
exception when duplicate_object then null; end $$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('customer','pro','admin')),
  display_name text,
  phone text,
  created_at timestamptz default now()
);

create table if not exists pros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  name text not null,
  category text not null check (category in ('plumbing','electrical','appliance','drywall_paint','assembly','cleaning')),
  rating numeric(2,1) default 4.5,
  reviews int default 0,
  rate_usd_hr int default 75,
  lat double precision default 25.7617,
  lng double precision default -80.1918,
  city text default 'Miami, FL',
  created_at timestamptz default now()
);

create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid references pros(id) on delete cascade,
  day date not null,
  slots jsonb default '[]'::jsonb
);

create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id),
  photo_urls text[] default '{}',
  transcript text default '',
  lang text default 'en',
  ai_spec jsonb,
  preview_url text,
  created_at timestamptz default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid references scans(id),
  customer_id uuid references profiles(id),
  pro_id uuid references pros(id),
  status job_status default 'quoted',
  price_usd int,
  slot timestamptz,
  before_urls text[] default '{}',
  after_urls text[] default '{}',
  verify_result jsonb,
  created_at timestamptz default now()
);

create table if not exists job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  kind text not null,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  stripe_pi_id text,
  amount_usd int not null,
  status text default 'requires_capture',
  created_at timestamptz default now()
);

-- Storage bucket `media` must exist (created via dashboard or seed script).

-- RLS
alter table profiles enable row level security;
alter table pros enable row level security;
alter table availability enable row level security;
alter table scans enable row level security;
alter table jobs enable row level security;
alter table job_events enable row level security;
alter table payments enable row level security;

-- Demo-friendly permissive policies (hackathon MVP; tighten post-demo).
drop policy if exists "open read pros" on pros;
create policy "open read pros" on pros for select using (true);
drop policy if exists "open read availability" on availability;
create policy "open read availability" on availability for select using (true);
drop policy if exists "open all scans" on scans;
create policy "open all scans" on scans for all using (true) with check (true);
drop policy if exists "open all jobs" on jobs;
create policy "open all jobs" on jobs for all using (true) with check (true);
drop policy if exists "open all events" on job_events;
create policy "open all events" on job_events for all using (true) with check (true);
drop policy if exists "open all profiles" on profiles;
create policy "open all profiles" on profiles for all using (true) with check (true);
drop policy if exists "open all payments" on payments;
create policy "open all payments" on payments for all using (true) with check (true);

-- Realtime
do $$ begin
  alter publication supabase_realtime add table job_events;
  alter publication supabase_realtime add table jobs;
exception when others then null; end $$;
