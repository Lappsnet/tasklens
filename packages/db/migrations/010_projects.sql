-- TaskLens S4: Project Planner (construction/remodels). Phases are jobs under the hood.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id),
  title text not null,
  video_note text default '',
  plan jsonb,
  status text not null default 'draft' check (status in ('draft','planned','in_progress','completed')),
  created_at timestamptz default now()
);

create table if not exists project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  trade text not null,
  title text not null,
  scope text default '',
  est_days numeric(5,2) default 1,
  budget_low_usd int default 0,
  budget_high_usd int default 0,
  materials jsonb default '[]'::jsonb,
  job_id uuid references jobs(id),
  finish_pick text,
  status text not null default 'planned' check (status in ('planned','booked','in_progress','verified')),
  seq int not null default 0,
  created_at timestamptz default now()
);

create table if not exists phase_dependencies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  phase_id uuid references project_phases(id) on delete cascade,
  depends_on uuid references project_phases(id) on delete cascade
);

alter table projects enable row level security;
alter table project_phases enable row level security;
alter table phase_dependencies enable row level security;

drop policy if exists "projects owner read" on projects;
create policy "projects owner read" on projects
  for select using (auth.uid() = customer_id);

drop policy if exists "phases via project" on project_phases;
create policy "phases via project" on project_phases
  for select using (
    exists (select 1 from projects p where p.id = project_phases.project_id and p.customer_id = auth.uid())
  );

drop policy if exists "deps via project" on phase_dependencies;
create policy "deps via project" on phase_dependencies
  for select using (
    exists (select 1 from projects p where p.id = phase_dependencies.project_id and p.customer_id = auth.uid())
  );
