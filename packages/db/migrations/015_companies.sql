-- TaskLens U4: contractor companies (Empresa role).
-- A company lists several pros (team) and receives jobs as a team.
-- `company_id` on jobs is nullable; dispatch assigns a member pro.

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id),
  name text not null,
  zone text default '',
  created_at timestamptz default now()
);

create table if not exists company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  pro_id uuid references pros(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','dispatcher','member')),
  created_at timestamptz default now(),
  unique(company_id, pro_id)
);

alter table jobs add column if not exists company_id uuid references companies(id) on delete set null;

-- Widen the role check (012 created it without 'company').
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('customer','pro','company','admin','city_operator'));

alter table companies enable row level security;
alter table company_members enable row level security;

-- Members read their own companies and team rows (identity via pros.user_id).
drop policy if exists "companies member read" on companies;
create policy "companies member read" on companies
  for select using (
    owner_id = auth.uid() or exists (
      select 1 from company_members m join pros p on p.id = m.pro_id
      where m.company_id = companies.id and p.user_id = auth.uid()
    )
  );

drop policy if exists "members team read" on company_members;
create policy "members team read" on company_members
  for select using (
    exists (
      select 1 from companies c
      left join company_members m2 on m2.company_id = c.id
      left join pros p on p.id = m2.pro_id
      where c.id = company_members.company_id
        and (c.owner_id = auth.uid() or p.user_id = auth.uid())
    )
  );

-- Team jobs readable by members of the job's company.
drop policy if exists "jobs company read" on jobs;
create policy "jobs company read" on jobs
  for select using (
    company_id is not null and exists (
      select 1 from company_members m join pros p on p.id = m.pro_id
      where m.company_id = jobs.company_id and p.user_id = auth.uid()
    )
  );

-- Writes happen only through the service role after dispatcher/owner checks
-- in /api/companies/* (dispatch assigns a member pro to the job).
