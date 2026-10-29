-- TaskLens P1: pro onboarding applications + admin verification queue.
-- ID photos live in the private `media` bucket (path only); memory mode keeps
-- metadata + a bounded data URL for demo review. Default deny; server only.

create table if not exists pro_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('plumbing','electrical','appliance','drywall_paint','assembly','cleaning')),
  zone text not null,
  phone text not null,
  rate_usd_hr int not null default 40 check (rate_usd_hr between 5 and 500),
  id_photo_path text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reject_reason text,
  reviewed_by text,
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

alter table pro_applications enable row level security;

-- No select/insert/update policies for anon or authenticated: the public apply
-- form posts to a rate-limited server route, and only the admin queue reads via
-- the service role. Default deny stands.
