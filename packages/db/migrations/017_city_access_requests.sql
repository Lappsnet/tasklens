-- TaskLens U5: municipal access requests (Alcaldías section CTA).
-- Public form, rate-limited, reviewed manually. Default deny; service role only.

create table if not exists city_access_requests (
  id uuid primary key default gen_random_uuid(),
  municipality text not null,
  name text not null,
  role text not null,
  email text not null,
  status text not null default 'pending' check (status in ('pending','contacted','approved','rejected')),
  created_at timestamptz default now()
);

alter table city_access_requests enable row level security;
