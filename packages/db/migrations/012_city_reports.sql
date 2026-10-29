-- TaskLens S7: TaskLens for Cities (public issue reports, per-municipality fencing).

create table if not exists public_reports (
  id uuid primary key default gen_random_uuid(),
  city_slug text not null,
  country_code text not null default '',
  title text not null,
  category text not null check (category in ('street_light','water_leak','road','sidewalk','waste','drainage','other')),
  severity text not null check (severity in ('low','medium','high','urgent')),
  description text not null,
  lat double precision not null,
  lng double precision not null,
  status text not null default 'open' check (status in ('open','triaged','assigned','in_progress','resolved','closed','duplicate')),
  reporter_id uuid references profiles(id),
  assigned_pro_id uuid references pros(id),
  duplicate_of uuid references public_reports(id),
  photo_url text,
  proof_url text,
  sla_due timestamptz not null,
  cluster_id uuid,
  created_at timestamptz default now()
);

create table if not exists report_clusters (
  id uuid primary key default gen_random_uuid(),
  city_slug text not null,
  category text not null,
  lat double precision not null,
  lng double precision not null,
  report_count int not null default 1,
  status text not null default 'open',
  created_at timestamptz default now()
);

-- City operators: extend the role enum + track each operator's municipality.
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('customer','pro','admin','city_operator'));
alter table profiles add column if not exists city_slug text;

alter table public_reports enable row level security;
alter table report_clusters enable row level security;

-- Residents read their own city's board (the app always filters by city_slug).
drop policy if exists "city reports city read" on public_reports;
create policy "city reports city read" on public_reports
  for select using (true);

-- Operators manage only their own municipality; admins manage all.
drop policy if exists "city reports operator write" on public_reports;
create policy "city reports operator write" on public_reports
  for update using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (p.role = 'admin' or (p.role = 'city_operator' and p.city_slug = public_reports.city_slug))
    )
  );

drop policy if exists "city clusters city read" on report_clusters;
create policy "city clusters city read" on report_clusters
  for select using (true);
